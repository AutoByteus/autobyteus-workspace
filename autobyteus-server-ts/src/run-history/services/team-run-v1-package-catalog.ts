import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TeamRunStatePackageLoader } from "./team-run-state-package-loader.js";

type CatalogState = {
  initialized: boolean;
  admitted: Set<string>;
  diagnostics: Map<string, string>;
};

const states = new Map<string, CatalogState>();
const keyFor = (memoryDir: string): string => path.resolve(memoryDir);
const stateFor = (memoryDir: string): CatalogState => {
  const key = keyFor(memoryDir);
  const current = states.get(key);
  if (current) return current;
  const created = { initialized: false, admitted: new Set<string>(), diagnostics: new Map<string, string>() };
  states.set(key, created);
  return created;
};

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** Process-local admission catalog rebuilt before current Team runtime is exposed. */
export class TeamRunV1PackageCatalog {
  private readonly state: CatalogState;
  private readonly layout: AgentMemoryLayout;
  private readonly packageLoader: Pick<TeamRunStatePackageLoader, "loadAndRepair">;

  constructor(
    private readonly memoryDir: string,
    packageLoader?: Pick<TeamRunStatePackageLoader, "loadAndRepair">,
  ) {
    this.state = stateFor(memoryDir);
    this.layout = new AgentMemoryLayout(memoryDir);
    this.packageLoader = packageLoader ?? new TeamRunStatePackageLoader({
      executionTreeStore: new TeamRunExecutionTreeStore(),
      taskRecordsStore: new TaskDelegationRecordsV1Store(),
      communicationStore: new TeamCommunicationV1Store(),
    });
  }

  isInitialized(): boolean { return this.state.initialized; }
  isAdmitted(rootTeamRunId: string): boolean {
    return this.state.admitted.has(rootTeamRunId.trim());
  }
  listAdmittedRootIds(): string[] { return [...this.state.admitted].sort(); }
  getDiagnostics(): ReadonlyMap<string, string> { return new Map(this.state.diagnostics); }

  admit(rootTeamRunId: string): void {
    const normalized = rootTeamRunId.trim();
    if (!normalized) throw new Error("rootTeamRunId is required.");
    this.state.admitted.add(normalized);
    this.state.diagnostics.delete(normalized);
  }

  exclude(rootTeamRunId: string, reason: string): void {
    const normalized = rootTeamRunId.trim();
    if (!normalized) return;
    this.state.admitted.delete(normalized);
    this.state.diagnostics.set(normalized, reason);
  }

  async rebuild(): Promise<void> {
    this.state.initialized = true;
    this.state.admitted.clear();
    this.state.diagnostics.clear();
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fs.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true });
    } catch (error) {
      if (missing(error)) return;
      throw error;
    }
    for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const rootTeamRunId = entry.name;
      const rootDir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
      try {
        // The predecessor file is the promotion marker: while it remains, the
        // root is migration-owned even if a crash left target files behind.
        await fs.access(path.join(rootDir, "team_run_metadata.json"));
        this.exclude(rootTeamRunId, "Predecessor TeamRun metadata remains pending migration.");
        continue;
      } catch (error) {
        if (!missing(error)) throw error;
      }
      try {
        const loaded = await this.packageLoader.loadAndRepair({
          teamMemoryDir: rootDir,
          rootTeamRunId,
        });
        if (!loaded.loaded) {
          this.exclude(rootTeamRunId, `${loaded.code}: ${loaded.message}`);
          continue;
        }
        this.admit(rootTeamRunId);
      } catch (error) {
        this.exclude(rootTeamRunId, error instanceof Error ? error.message : String(error));
      }
    }
  }
}

export const resetTeamRunV1PackageCatalog = (memoryDir: string): void => {
  states.delete(keyFor(memoryDir));
};
