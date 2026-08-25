import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import type { TeamRunIndexRowRecord } from "../store/team-run-history-index-record-types.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";
import { compactSummary } from "./run-history-service-helpers.js";
import { projectTeamRunHistoryIndexRow } from "./team-run-history-index-row-projector.js";
import { TeamRunPackageCatalog } from "./team-run-package-catalog.js";

type CatalogState = {
  initialized: boolean;
  initPromise: Promise<void> | null;
  rows: Map<string, TeamRunIndexRowRecord>;
  queue: Promise<void>;
};
type TeamRunHistoryManager = {
  hasManagedTeamRun(teamRunId: string): boolean;
  withUnmanagedHistoryDeletion<T>(
    teamRunId: string,
    operation: () => Promise<T>,
  ): Promise<{ kind: "managed" } | { kind: "completed"; value: T }>;
};
type CatalogMutationResult<T> = { value: T; shouldFlush: boolean };

const states = new Map<string, CatalogState>();
const stateFor = (memoryDir: string): CatalogState => {
  const key = path.resolve(memoryDir);
  const existing = states.get(key);
  if (existing) return existing;
  const created = { initialized: false, initPromise: null, rows: new Map(), queue: Promise.resolve() };
  states.set(key, created);
  return created;
};

export const resetTeamRunHistoryCatalogState = (memoryDir: string): void => {
  states.delete(path.resolve(memoryDir));
};

const safeRunId = (value: string): string => {
  const runId = value.trim();
  if (!runId) throw new Error("teamRunId cannot be empty.");
  if (path.isAbsolute(runId) || /[\\/]/.test(runId) || runId === "." || runId === "..") {
    throw new Error("teamRunId must be a safe team run identity.");
  }
  return runId;
};
const normalizeRow = (row: TeamRunIndexRowRecord): TeamRunIndexRowRecord => ({
  ...row,
  summary: compactSummary(row.summary),
});

export interface TeamCatalogMutationResultMessage { success: boolean; message: string }

/** Catalog projection over the current V2 execution tree; it owns no fourth Team state file. */
export class TeamRunHistoryCatalogService {
  private readonly indexStore: TeamRunHistoryIndexStore;
  private readonly treeStore: TeamRunExecutionTreeStore;
  private readonly manager: TeamRunHistoryManager;
  private readonly layout: AgentMemoryLayout;
  private readonly state: CatalogState;
  private readonly packageCatalog: TeamRunPackageCatalog;
  private readonly removePackage: (teamDirPath: string) => Promise<void>;

  constructor(private readonly memoryDir: string, dependencies: {
    indexStore?: TeamRunHistoryIndexStore;
    executionTreeStore?: TeamRunExecutionTreeStore;
    teamRunManager?: TeamRunHistoryManager;
    packageCatalog?: TeamRunPackageCatalog;
    removePackage?: (teamDirPath: string) => Promise<void>;
  } = {}) {
    this.indexStore = dependencies.indexStore ?? new TeamRunHistoryIndexStore(memoryDir);
    this.treeStore = dependencies.executionTreeStore ?? new TeamRunExecutionTreeStore();
    this.manager = dependencies.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.layout = new AgentMemoryLayout(memoryDir);
    this.packageCatalog = dependencies.packageCatalog ?? new TeamRunPackageCatalog(memoryDir);
    this.removePackage = dependencies.removePackage ?? ((teamDirPath) =>
      fs.rm(teamDirPath, { recursive: true, force: true }));
    this.state = stateFor(memoryDir);
  }

  async listCatalogRows(): Promise<TeamRunIndexRow[]> {
    await this.ensureInitialized();
    return this.sorted(this.state.rows);
  }

  async getCatalogRow(teamRunId: string): Promise<TeamRunIndexRow | null> {
    await this.ensureInitialized();
    return this.state.rows.get(teamRunId.trim()) ?? null;
  }

  async recordTeamRunCreated(input: {
    tree: TeamRunExecutionTreeSnapshot;
    summary?: string | null;
  }): Promise<void> {
    await this.enqueue(async () => {
      const row = projectTeamRunHistoryIndexRow({ tree: input.tree, recoveredSummary: input.summary });
      if (this.state.rows.has(row.teamRunId)) throw new Error(`Team run '${row.teamRunId}' already exists in team history.`);
      const rows = new Map(this.state.rows);
      rows.set(row.teamRunId, row);
      await this.flush(rows);
      this.state.rows = rows;
    });
  }

  async recordTeamRunRestored(input: { tree: TeamRunExecutionTreeSnapshot }): Promise<void> {
    await this.enqueue(async () => {
      const current = this.state.rows.get(input.tree.rootTeam.teamRunId) ?? null;
      const rows = new Map(this.state.rows);
      rows.set(input.tree.rootTeam.teamRunId, normalizeRow({
        ...projectTeamRunHistoryIndexRow({ tree: input.tree, existingRow: current }),
        terminatedAt: null,
      }));
      await this.flush(rows);
      this.state.rows = rows;
    });
  }

  async recordTeamRunSummary(input: { teamRunId: string; summary?: string | null }): Promise<void> {
    const summary = compactSummary(input.summary ?? null);
    if (!summary) return;
    await this.mutate(async (rows) => {
      const row = rows.get(safeRunId(input.teamRunId));
      if (!row || row.summary) return { value: undefined, shouldFlush: false };
      rows.set(row.teamRunId, normalizeRow({ ...row, summary }));
      return { value: undefined, shouldFlush: true };
    });
  }

  async recordTeamRunTerminated(input: { teamRunId: string; terminatedAt?: string }): Promise<void> {
    await this.mutate(async (rows) => {
      const row = rows.get(safeRunId(input.teamRunId));
      if (!row) return { value: undefined, shouldFlush: false };
      rows.set(row.teamRunId, normalizeRow({ ...row, terminatedAt: input.terminatedAt ?? new Date().toISOString() }));
      return { value: undefined, shouldFlush: true };
    });
  }

  archiveTeamRun(teamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    return this.setArchived(teamRunId, true);
  }
  unarchiveTeamRun(teamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    return this.setArchived(teamRunId, false);
  }

  async deleteTeamRun(rawTeamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    const identity = this.resolveIdentity(rawTeamRunId, true);
    if (!identity) return { success: false, message: "Invalid team run ID path." };
    return this.enqueueValue(async () => {
      const transition = await this.manager.withUnmanagedHistoryDeletion(identity.teamRunId, async () => {
        const originalRows = new Map(this.state.rows);
        const originalRow = originalRows.get(identity.teamRunId) ?? null;
        if (!originalRow) {
          return { success: false, message: `Team run '${identity.teamRunId}' was not found.` };
        }
        const candidateRows = new Map(originalRows);
        candidateRows.delete(identity.teamRunId);
        try {
          await this.flush(candidateRows);
        } catch (error) {
          return { success: false, message: `Team run history index removal failed: ${String(error)}` };
        }
        try {
          await this.removePackage(identity.teamDirPath);
        } catch (error) {
          await this.restoreAndValidateDeleteTarget({
            teamRunId: identity.teamRunId,
            teamDirPath: identity.teamDirPath,
            originalRows,
            originalRow,
          });
          return { success: false, message: `Team run package removal failed: ${String(error)}` };
        }
        this.state.rows = candidateRows;
        this.packageCatalog.exclude(identity.teamRunId, "Team run history was deleted permanently.");
        return { success: true, message: `Team run '${identity.teamRunId}' deleted permanently.` };
      });
      return transition.kind === "managed"
        ? { success: false, message: "Team run is active or stopping. Terminate it before deleting history." }
        : transition.value;
    });
  }

  private async setArchived(rawTeamRunId: string, archived: boolean): Promise<TeamCatalogMutationResultMessage> {
    const identity = this.resolveIdentity(rawTeamRunId, true);
    if (!identity) return { success: false, message: "Invalid team run ID path." };
    if (this.manager.hasManagedTeamRun(identity.teamRunId)) return { success: false, message: "Team run is active. Terminate it before archiving history." };
    return this.enqueueValue(async () => {
      const tree = await this.treeStore.read(identity.teamDirPath, identity.teamRunId);
      if (!tree) return { success: false, message: `Team run execution tree not found for '${identity.teamRunId}'.` };
      const next = { ...tree, archivedAt: archived ? tree.archivedAt ?? new Date().toISOString() : null };
      const write = await this.treeStore.write(identity.teamDirPath, next);
      if (write.outcome !== "committed") return { success: false, message: `Team run archive change did not commit (${write.outcome}).` };
      const rows = new Map(this.state.rows);
      const current = rows.get(identity.teamRunId) ?? null;
      rows.set(identity.teamRunId, projectTeamRunHistoryIndexRow({ tree: next, existingRow: current }));
      await this.flush(rows);
      this.state.rows = rows;
      return { success: true, message: `Team run '${identity.teamRunId}' ${archived ? "archived" : "unarchived"}.` };
    });
  }

  private async mutate<T>(operation: (rows: Map<string, TeamRunIndexRowRecord>) => Promise<CatalogMutationResult<T>>): Promise<T> {
    return this.enqueueValue(async () => {
      const rows = new Map(this.state.rows);
      const result = await operation(rows);
      if (result.shouldFlush) {
        await this.flush(rows);
        this.state.rows = rows;
      }
      return result.value;
    });
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    await this.ensureInitialized();
    const next = this.state.queue.then(operation, operation);
    this.state.queue = next.then(() => undefined, () => undefined);
    return next;
  }
  private async enqueueValue<T>(operation: () => Promise<T>): Promise<T> {
    let value!: T;
    await this.enqueue(async () => { value = await operation(); });
    return value;
  }
  private async ensureInitialized(): Promise<void> {
    if (this.state.initialized) return;
    this.state.initPromise ??= this.indexStore.readIndex().then((rows) => {
      this.state.rows = new Map(rows.filter((row) =>
        !this.packageCatalog.isInitialized() || this.packageCatalog.isAdmitted(row.teamRunId),
      ).map((row) => {
        const normalized = normalizeRow(row);
        return [normalized.teamRunId, normalized];
      }));
      this.state.initialized = true;
    });
    await this.state.initPromise;
  }
  private sorted(rows: Map<string, TeamRunIndexRowRecord>): TeamRunIndexRow[] {
    return [...rows.values()].map(normalizeRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  private flush(rows: Map<string, TeamRunIndexRowRecord>): Promise<void> {
    return this.indexStore.writeIndex(this.sorted(rows));
  }
  private async restoreAndValidateDeleteTarget(input: {
    teamRunId: string;
    teamDirPath: string;
    originalRows: Map<string, TeamRunIndexRowRecord>;
    originalRow: TeamRunIndexRowRecord;
  }): Promise<void> {
    await this.flush(input.originalRows);
    const durableRows = await this.indexStore.readIndexStrict();
    const durableRow = durableRows.rows.find((row) => row.teamRunId === input.teamRunId) ?? null;
    if (!durableRow || JSON.stringify(normalizeRow(durableRow)) !== JSON.stringify(normalizeRow(input.originalRow))) {
      throw new Error(`Team run '${input.teamRunId}' history index compensation could not be verified.`);
    }
    const tree = await this.treeStore.read(input.teamDirPath, input.teamRunId);
    if (!tree) throw new Error(`Team run '${input.teamRunId}' execution tree was not readable after compensation.`);
  }
  private resolveIdentity(rawTeamRunId: string, rejectDraft: boolean): { teamRunId: string; teamDirPath: string } | null {
    const teamRunId = rawTeamRunId.trim();
    if (!teamRunId || (rejectDraft && teamRunId.startsWith("temp-"))) return null;
    try { safeRunId(teamRunId); } catch { return null; }
    const root = path.resolve(this.layout.getTeamRootDirPath());
    const teamDirPath = path.resolve(this.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }));
    return teamDirPath.startsWith(`${root}${path.sep}`) ? { teamRunId, teamDirPath } : null;
  }
}

const cache = new Map<string, TeamRunHistoryCatalogService>();
export const getTeamRunHistoryCatalogService = (): TeamRunHistoryCatalogService => {
  const memoryDir = appConfigProvider.config.getMemoryDir();
  const key = path.resolve(memoryDir);
  return cache.get(key) ?? (() => {
    const created = new TeamRunHistoryCatalogService(memoryDir);
    cache.set(key, created);
    return created;
  })();
};
