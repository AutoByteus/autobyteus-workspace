import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";
import { AgentOrgRunHistoryIndexStore } from "../store/agent-org-run-history-index-store.js";
import { AgentOrgRunPackageCatalog } from "./agent-org-run-package-catalog.js";
import { CollaborationRunHistoryCatalogCore } from "./collaboration-run-history-catalog-core.js";
import { projectAgentOrgRunHistoryRow } from "./agent-org-run-history-row-projector.js";
import { AgentOrgContainerStore } from "../store/agent-org-container-store.js";
import type { AgentOrgContainerFile } from "../../agent-org-execution/domain/agent-org-container-file.js";
import { composeOrgExecutionTree } from "../../agent-org-execution/container/org-execution-tree-composition.js";
import { readStoredUnitFiles } from "../../agent-org-execution/container/stored-org-tree.js";
import { RootRunPackageReadinessIndex } from "./root-run-package-readiness-index.js";
import {
  createAgentRootExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export interface AgentOrgHistoryMutationResult {
  success: boolean;
  message: string;
  /** A deleted Org container's unit runs (deleted with it): the caller tells the episodic catalogs. */
  unitRuns?: readonly RootExecutionIdentity[];
}

type InactiveHistoryManager = Pick<AgentOrgRunManager, "withInactiveHistoryMutation">;
type AgentOrgRunIdentity = Readonly<{ orgRunId: string; orgDirPath: string }>;

/** Derived AgentOrg history authority. Runtime/history reads never consult live definitions. */
export class AgentOrgRunHistoryCatalogService {
  private readonly layout: AgentMemoryLayout;
  private readonly index: AgentOrgRunHistoryIndexStore;
  private readonly packages: AgentOrgRunPackageCatalog;
  private readonly core: CollaborationRunHistoryCatalogCore<AgentOrgRunIndexRowRecord>;
  private readonly removePackage: (orgDirPath: string) => Promise<void>;
  private readonly containers = new AgentOrgContainerStore();

  constructor(
    private readonly memoryDir: string,
    private readonly manager: InactiveHistoryManager,
    options: {
      indexStore?: AgentOrgRunHistoryIndexStore;
      packageCatalog?: AgentOrgRunPackageCatalog;
      removePackage?: (orgDirPath: string) => Promise<void>;
    } = {},
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.index = options.indexStore ?? new AgentOrgRunHistoryIndexStore(memoryDir);
    this.packages = options.packageCatalog ?? new AgentOrgRunPackageCatalog(memoryDir);
    this.core = new CollaborationRunHistoryCatalogCore(memoryDir, "agent_org", {
      idOf: (row) => row.orgRunId,
      readRows: () => this.index.readIndex(),
      writeRows: (rows) => this.index.writeIndex(rows),
      awaitReady: () => this.packages.awaitReady(),
      isAdmitted: (id) => this.packages.isAdmitted(id),
    });
    this.removePackage = options.removePackage ?? ((orgDirPath) =>
      fs.rm(orgDirPath, { recursive: true, force: true }));
  }

  listCatalogRows(): Promise<readonly AgentOrgRunIndexRowRecord[]> { return this.core.listCatalogRows(); }
  getCatalogRow(orgRunId: string): Promise<AgentOrgRunIndexRowRecord | null> { return this.core.getCatalogRow(orgRunId); }
  async recordCreated(tree: AgentOrgRunExecutionTreeSnapshot): Promise<void> { await this.upsert(tree, false); }
  async recordRestored(tree: AgentOrgRunExecutionTreeSnapshot): Promise<void> { await this.upsert(tree, true); }
  async recordRunSummary(input: Readonly<{ orgRunId: string; summary?: string | null }>): Promise<void> {
    await this.core.recordFirstSummary(input.orgRunId, input.summary, (id) => {
      throw new Error(`AgentOrg run '${id}' is missing from current history.`);
    });
  }
  async recordTerminated(orgRunId: string, terminatedAt = new Date().toISOString()): Promise<void> {
    await this.core.withQueue(async () => {
      const rows = this.core.rowsInQueue();
      const current = rows.get(orgRunId);
      if (!current) return;
      rows.set(orgRunId, Object.freeze({ ...current, terminatedAt }));
      await this.core.commitInQueue(rows);
    });
  }

  async archiveStored(rawOrgRunId: string): Promise<AgentOrgHistoryMutationResult> {
    const identity = this.resolveIdentity(rawOrgRunId);
    if (!identity) return { success: false, message: "Invalid AgentOrg run ID path." };
    return this.core.withQueue(async () => {
      const transition = await this.manager.withInactiveHistoryMutation(identity.orgRunId, async () => {
        const originalRows = new Map(this.core.rowsInQueue());
        const originalRow = originalRows.get(identity.orgRunId) ?? null;
        if (!originalRow) return { success: false, message: `AgentOrg run '${identity.orgRunId}' was not found.` };
        const container = await this.containers.readIfContainer(identity.orgDirPath, identity.orgRunId);
        // Readiness admits only containers: an Org file that is not one never reaches history (org-teams-follow-definition).
        if (!container) return { success: false, message: `AgentOrg run execution tree not found for '${identity.orgRunId}'.` };
        return this.archiveContainer(identity, container, originalRows, originalRow);
      });
      return transition.kind === "managed"
        ? { success: false, message: "AgentOrg run is active or managed. Terminate it before archiving history." }
        : transition.value;
    });
  }

  async deleteStored(rawOrgRunId: string): Promise<AgentOrgHistoryMutationResult> {
    const identity = this.resolveIdentity(rawOrgRunId);
    if (!identity) return { success: false, message: "Invalid AgentOrg run ID path." };
    return this.core.withQueue(async () => {
      const transition = await this.manager.withInactiveHistoryMutation(identity.orgRunId, async () => {
        const originalRows = new Map(this.core.rowsInQueue());
        const originalRow = originalRows.get(identity.orgRunId) ?? null;
        if (!originalRow) return { success: false, message: `AgentOrg run '${identity.orgRunId}' was not found.` };
        const container = await this.containers.readIfContainer(identity.orgDirPath, identity.orgRunId);
        if (!container) return { success: false, message: `AgentOrg run execution tree not found for '${identity.orgRunId}'.` };
        return this.deleteContainer(identity, container, originalRows);
      });
      return transition.kind === "managed"
        ? { success: false, message: "AgentOrg run is active or managed. Terminate it before deleting history." }
        : transition.value;
    });
  }

  private async upsert(tree: AgentOrgRunExecutionTreeSnapshot, restored: boolean): Promise<void> {
    await this.mutate(async (rows) => {
      const existing = rows.get(tree.rootOrg.orgRunId) ?? null;
      if (existing && !restored) throw new Error(`AgentOrg run '${tree.rootOrg.orgRunId}' already exists in history.`);
      rows.set(tree.rootOrg.orgRunId, Object.freeze({
        ...projectAgentOrgRunHistoryRow(tree, existing),
        terminatedAt: restored ? null : existing?.terminatedAt ?? null,
      }));
    });
  }

  private async mutate(operation: (rows: Map<string, AgentOrgRunIndexRowRecord>) => Promise<void>): Promise<void> {
    await this.core.withQueue(async () => {
      const rows = this.core.rowsInQueue();
      await operation(rows);
      await this.core.commitInQueue(rows);
    });
  }
  private flush(rows: Map<string, AgentOrgRunIndexRowRecord>): Promise<void> {
    return this.core.writeCandidateInQueue(rows);
  }
  private sorted(rows: Map<string, AgentOrgRunIndexRowRecord>): AgentOrgRunIndexRowRecord[] {
    return [...rows.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
  private sameRows(actual: readonly AgentOrgRunIndexRowRecord[], expected: Map<string, AgentOrgRunIndexRowRecord>): boolean {
    return isDeepStrictEqual(this.sorted(new Map(actual.map((row) => [row.orgRunId, row]))), this.sorted(expected));
  }
  /** An Org container's archive (org-teams-follow-definition): its own file marked archived; its row from its composed tree. */
  private async archiveContainer(identity: AgentOrgRunIdentity, original: AgentOrgContainerFile,
    originalRows: Map<string, AgentOrgRunIndexRowRecord>, originalRow: AgentOrgRunIndexRowRecord): Promise<AgentOrgHistoryMutationResult> {
    const archived = Object.freeze({ ...original, archivedAt: original.archivedAt ?? new Date().toISOString() });
    const restore = async (): Promise<void> => {
      await this.containers.write(identity.orgDirPath, original);
      await this.flush(originalRows);
    };
    const written = await this.containers.write(identity.orgDirPath, archived).then((result) => result.outcome, () => "threw" as const);
    const readback = written === "committed" ? await this.containers.readIfContainer(identity.orgDirPath, identity.orgRunId).catch(() => null) : null;
    if (!readback || !isDeepStrictEqual(readback, archived)) {
      await restore();
      return { success: false, message: `AgentOrg archive change did not commit (${written}).` };
    }
    const candidateRows = new Map(originalRows);
    candidateRows.set(identity.orgRunId, projectAgentOrgRunHistoryRow(
      composeOrgExecutionTree(archived, await readStoredUnitFiles(this.memoryDir, archived)), originalRow));
    try {
      await this.flush(candidateRows);
      if (!this.sameRows(await this.index.readIndex(), candidateRows)) throw new Error("AgentOrg archive index readback mismatch.");
    } catch (error) {
      await restore();
      return { success: false, message: `AgentOrg archive index update failed: ${String(error)}` };
    }
    this.core.publishInQueue(candidateRows);
    return { success: true, message: `AgentOrg run '${identity.orgRunId}' archived.` };
  }

  /**
   * An Org container's permanent delete (org-teams-follow-definition): its history row, then each unit run's folder (the
   * units are the Org's: they are listed nowhere else), then its own folder; each package retired from readiness.
   */
  private async deleteContainer(identity: AgentOrgRunIdentity, file: AgentOrgContainerFile,
    originalRows: Map<string, AgentOrgRunIndexRowRecord>): Promise<AgentOrgHistoryMutationResult> {
    const candidateRows = new Map(originalRows);
    candidateRows.delete(identity.orgRunId);
    try {
      await this.flush(candidateRows);
      if (!this.sameRows(await this.index.readIndex(), candidateRows)) throw new Error("AgentOrg delete index readback mismatch.");
    } catch (error) {
      await this.flush(originalRows).catch(() => undefined);
      return { success: false, message: `AgentOrg history index removal failed: ${String(error)}` };
    }
    this.core.publishInQueue(candidateRows);
    const readiness = new RootRunPackageReadinessIndex(this.memoryDir);
    const unitRuns: RootExecutionIdentity[] = [];
    for (const unit of [...file.rootOrg.units, ...file.rootOrg.formerUnits]) {
      const team = unit.kind === "agent_team";
      await this.removePackage(team ? this.layout.getTeamDirPath({ rootTeamRunId: unit.runId, ancestorTeamRunIds: [] }) : this.layout.getStandaloneRunDirPath(unit.runId));
      readiness.excludeCurrent(team ? "agent_team" : "agent", unit.runId, "Its AgentOrg run history was deleted permanently.");
      unitRuns.push(team ? createTeamRootExecutionIdentity(unit.runId) : createAgentRootExecutionIdentity(unit.runId));
    }
    await this.removePackage(identity.orgDirPath);
    this.packages.exclude(identity.orgRunId, "AgentOrg run history was deleted permanently.");
    return { success: true, message: `AgentOrg run '${identity.orgRunId}' deleted permanently.`, unitRuns };
  }

  private resolveIdentity(rawOrgRunId: string): AgentOrgRunIdentity | null {
    const orgRunId = rawOrgRunId?.trim();
    if (!orgRunId || orgRunId !== rawOrgRunId || path.isAbsolute(orgRunId)
      || /[\\/]/.test(orgRunId) || orgRunId === "." || orgRunId === "..") return null;
    try {
      const root = path.resolve(this.layout.getOrgRootDirPath());
      const orgDirPath = path.resolve(this.layout.getOrgDirPath(orgRunId));
      return orgDirPath.startsWith(`${root}${path.sep}`) ? Object.freeze({ orgRunId, orgDirPath }) : null;
    } catch { return null; }
  }
}
