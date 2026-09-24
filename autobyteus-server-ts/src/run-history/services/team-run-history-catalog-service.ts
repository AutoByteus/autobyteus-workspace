import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import type { TeamRunIndexRowRecord } from "../store/team-run-history-index-record-types.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";
import { CollaborationRunHistoryCatalogCore, resetCollaborationRunHistoryCatalogState } from "./collaboration-run-history-catalog-core.js";
import { projectTeamRunHistoryIndexRow } from "./team-run-history-index-row-projector.js";
import { TeamRunPackageCatalog } from "./team-run-package-catalog.js";

type TeamRunHistoryManager = {
  withInactiveHistoryMutation<T>(
    teamRunId: string,
    operation: () => Promise<T>,
  ): Promise<{ kind: "managed" } | { kind: "completed"; value: T }>;
};
type CatalogMutationResult<T> = { value: T; shouldFlush: boolean };

export const resetTeamRunHistoryCatalogState = (memoryDir: string): void => {
  resetCollaborationRunHistoryCatalogState(memoryDir, "agent_team");
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
  summary: CollaborationRunHistoryCatalogCore.compactSummary(row.summary),
});

export interface TeamCatalogMutationResultMessage { success: boolean; message: string }

/** Catalog projection over the current V2 execution tree; it owns no fourth Team state file. */
export class TeamRunHistoryCatalogService {
  private readonly indexStore: TeamRunHistoryIndexStore;
  private readonly treeStore: TeamRunExecutionTreeStore;
  private readonly manager: TeamRunHistoryManager;
  private readonly layout: AgentMemoryLayout;
  private readonly core: CollaborationRunHistoryCatalogCore<TeamRunIndexRowRecord>;
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
    this.core = new CollaborationRunHistoryCatalogCore(memoryDir, "agent_team", {
      idOf: (row) => row.teamRunId,
      readRows: async () => (await this.indexStore.readIndexStrict()).rows,
      writeRows: (rows) => this.indexStore.writeIndex([...rows]),
      awaitReady: () => this.packageCatalog.awaitReady(),
      isAdmitted: (id) => this.packageCatalog.isAdmitted(id),
    });
  }

  async listCatalogRows(): Promise<TeamRunIndexRow[]> {
    return [...await this.core.listCatalogRows()];
  }

  async getCatalogRow(teamRunId: string): Promise<TeamRunIndexRow | null> {
    return this.core.getCatalogRow(teamRunId);
  }

  async recordTeamRunCreated(input: {
    tree: TeamRunExecutionTreeSnapshot;
    summary?: string | null;
  }): Promise<void> {
    await this.enqueue(async () => {
      const row = projectTeamRunHistoryIndexRow({ tree: input.tree, recoveredSummary: input.summary });
      if (this.core.rowsInQueue().has(row.teamRunId)) throw new Error(`Team run '${row.teamRunId}' already exists in team history.`);
      const rows = new Map(this.core.rowsInQueue());
      rows.set(row.teamRunId, row);
      await this.flush(rows);
      this.core.publishInQueue(rows);
    });
  }

  async recordTeamRunRestored(input: { tree: TeamRunExecutionTreeSnapshot }): Promise<void> {
    await this.enqueue(async () => {
      const current = this.core.rowsInQueue().get(input.tree.rootTeam.teamRunId) ?? null;
      const rows = new Map(this.core.rowsInQueue());
      rows.set(input.tree.rootTeam.teamRunId, {
        ...projectTeamRunHistoryIndexRow({ tree: input.tree, existingRow: current }),
        summary: current?.summary ?? "",
        terminatedAt: null,
      });
      await this.flush(rows);
      this.core.publishInQueue(rows);
    });
  }

  async recordTeamRunSummary(input: { teamRunId: string; summary?: string | null }): Promise<void> {
    if (!CollaborationRunHistoryCatalogCore.compactSummary(input.summary)) return;
    await this.core.recordFirstSummary(safeRunId(input.teamRunId), input.summary);
  }

  async recordTeamRunTerminated(input: { teamRunId: string; terminatedAt?: string }): Promise<void> {
    await this.mutate(async (rows) => {
      const row = rows.get(safeRunId(input.teamRunId));
      if (!row) return { value: undefined, shouldFlush: false };
      rows.set(row.teamRunId, { ...row, terminatedAt: input.terminatedAt ?? new Date().toISOString() });
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
      const transition = await this.manager.withInactiveHistoryMutation(identity.teamRunId, async () => {
        const originalRows = new Map(this.core.rowsInQueue());
        const originalRow = originalRows.get(identity.teamRunId) ?? null;
        if (!originalRow) {
          return { success: false, message: `Team run '${identity.teamRunId}' was not found.` };
        }
        const candidateRows = new Map(originalRows);
        candidateRows.delete(identity.teamRunId);
        const originalTree = await this.treeStore.read(identity.teamDirPath, identity.teamRunId);
        if (!originalTree) return { success: false, message: `Team run execution tree not found for '${identity.teamRunId}'.` };
        const restore = () => this.restoreAndValidateDeleteTarget({
          teamRunId: identity.teamRunId,
          teamDirPath: identity.teamDirPath,
          originalRows,
          originalRow,
          originalTree,
        });
        try {
          await this.flush(candidateRows);
          const durable = (await this.indexStore.readIndexStrict()).rows;
          if (!isDeepStrictEqual(durable, this.sorted(candidateRows))) throw new Error("index readback mismatch");
        } catch (error) {
          await restore();
          return { success: false, message: `Team run history index removal failed: ${String(error)}` };
        }
        try {
          await this.removePackage(identity.teamDirPath);
        } catch (error) {
          await restore();
          return { success: false, message: `Team run package removal failed: ${String(error)}` };
        }
        const deletedTree = await this.treeStore.read(identity.teamDirPath, identity.teamRunId).catch((error) => {
          throw new Error(`Team run '${identity.teamRunId}' package deletion readback is indeterminate: ${String(error)}`);
        });
        if (deletedTree) {
          await restore();
          return { success: false, message: `Team run '${identity.teamRunId}' package still exists after deletion.` };
        }
        try { this.packageCatalog.exclude(identity.teamRunId, "Team run history was deleted permanently."); }
        catch (error) {
          throw new Error(`Team run '${identity.teamRunId}' was deleted, but readiness retirement is indeterminate: ${String(error)}`);
        }
        this.core.publishInQueue(candidateRows);
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
    return this.enqueueValue(async () => {
      const transition = await this.manager.withInactiveHistoryMutation(identity.teamRunId, async () => {
        const originalRows = this.core.rowsInQueue();
        const originalRow = originalRows.get(identity.teamRunId) ?? null;
        if (!originalRow) return { success: false, message: `Team run '${identity.teamRunId}' was not found.` };
        const originalTree = await this.treeStore.read(identity.teamDirPath, identity.teamRunId);
        if (!originalTree) return { success: false, message: `Team run execution tree not found for '${identity.teamRunId}'.` };
        const next = { ...originalTree, archivedAt: archived ? originalTree.archivedAt ?? new Date().toISOString() : null };
        try {
          const write = await this.treeStore.write(identity.teamDirPath, next);
          if (write.outcome !== "committed") throw new Error(`tree write ${write.outcome}`);
          const treeReadback = await this.treeStore.read(identity.teamDirPath, identity.teamRunId);
          if (!treeReadback || !isDeepStrictEqual(treeReadback, next)) throw new Error("tree readback mismatch");
          const rows = new Map(originalRows);
          rows.set(identity.teamRunId, {
            ...projectTeamRunHistoryIndexRow({ tree: next, existingRow: originalRow }),
            summary: originalRow.summary,
          });
          await this.core.writeCandidateInQueue(rows);
          const durable = (await this.indexStore.readIndexStrict()).rows;
          if (!isDeepStrictEqual(durable, this.sorted(rows))) throw new Error("index readback mismatch");
          this.core.publishInQueue(rows);
          return { success: true, message: `Team run '${identity.teamRunId}' ${archived ? "archived" : "unarchived"}.` };
        } catch (error) {
          await this.restoreAndValidateArchiveTarget(identity, originalTree, originalRows);
          return { success: false, message: `Team run archive change failed: ${String(error)}` };
        }
      });
      return transition.kind === "managed"
        ? { success: false, message: "Team run is active or stopping. Terminate it before archiving history." }
        : transition.value;
    });
  }

  private async mutate<T>(operation: (rows: Map<string, TeamRunIndexRowRecord>) => Promise<CatalogMutationResult<T>>): Promise<T> {
    return this.enqueueValue(async () => {
      const rows = new Map(this.core.rowsInQueue());
      const result = await operation(rows);
      if (result.shouldFlush) {
        await this.flush(rows);
        this.core.publishInQueue(rows);
      }
      return result.value;
    });
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    await this.core.withQueue(operation);
  }
  private async enqueueValue<T>(operation: () => Promise<T>): Promise<T> {
    return this.core.withQueue(operation);
  }
  private sorted(rows: Map<string, TeamRunIndexRowRecord>): TeamRunIndexRowRecord[] {
    return [...rows.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  private flush(rows: Map<string, TeamRunIndexRowRecord>): Promise<void> {
    return this.core.writeCandidateInQueue(rows);
  }
  private async restoreAndValidateArchiveTarget(
    identity: { teamRunId: string; teamDirPath: string },
    originalTree: TeamRunExecutionTreeSnapshot,
    originalRows: Map<string, TeamRunIndexRowRecord>,
  ): Promise<void> {
    try {
      const write = await this.treeStore.write(identity.teamDirPath, originalTree);
      if (write.outcome !== "committed") throw new Error(`tree restore ${write.outcome}`);
      await this.flush(originalRows);
      const [tree, durable] = await Promise.all([
        this.treeStore.read(identity.teamDirPath, identity.teamRunId),
        this.indexStore.readIndexStrict(),
      ]);
      if (!tree || !isDeepStrictEqual(tree, originalTree)
        || !isDeepStrictEqual(durable.rows, this.sorted(originalRows))) throw new Error("restored snapshot mismatch");
    } catch (error) {
      throw new Error(`Team run '${identity.teamRunId}' archive compensation is indeterminate: ${String(error)}`);
    }
  }
  private async restoreAndValidateDeleteTarget(input: {
    teamRunId: string;
    teamDirPath: string;
    originalRows: Map<string, TeamRunIndexRowRecord>;
    originalRow: TeamRunIndexRowRecord;
    originalTree: TeamRunExecutionTreeSnapshot;
  }): Promise<void> {
    await this.flush(input.originalRows);
    const durableRows = await this.indexStore.readIndexStrict();
    const durableRow = durableRows.rows.find((row) => row.teamRunId === input.teamRunId) ?? null;
    if (!durableRow || JSON.stringify(normalizeRow(durableRow)) !== JSON.stringify(normalizeRow(input.originalRow))) {
      throw new Error(`Team run '${input.teamRunId}' history index compensation could not be verified.`);
    }
    const tree = await this.treeStore.read(input.teamDirPath, input.teamRunId);
    if (!tree || !isDeepStrictEqual(tree, input.originalTree)) {
      throw new Error(`Team run '${input.teamRunId}' execution tree compensation is indeterminate.`);
    }
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
