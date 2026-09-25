import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";
import { AgentOrgRunHistoryIndexStore } from "../store/agent-org-run-history-index-store.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunPackageCatalog } from "./agent-org-run-package-catalog.js";
import { CollaborationRunHistoryCatalogCore } from "./collaboration-run-history-catalog-core.js";
import { projectAgentOrgRunHistoryRow } from "./agent-org-run-history-row-projector.js";

export interface AgentOrgHistoryMutationResult { success: boolean; message: string }

type InactiveHistoryManager = Pick<AgentOrgRunManager, "withInactiveHistoryMutation">;
type AgentOrgRunIdentity = Readonly<{ orgRunId: string; orgDirPath: string }>;

/** Derived AgentOrg history authority. Runtime/history reads never consult live definitions. */
export class AgentOrgRunHistoryCatalogService {
  private readonly layout: AgentMemoryLayout;
  private readonly index: AgentOrgRunHistoryIndexStore;
  private readonly trees: AgentOrgRunExecutionTreeStore;
  private readonly packages: AgentOrgRunPackageCatalog;
  private readonly core: CollaborationRunHistoryCatalogCore<AgentOrgRunIndexRowRecord>;
  private readonly removePackage: (orgDirPath: string) => Promise<void>;

  constructor(
    private readonly memoryDir: string,
    private readonly manager: InactiveHistoryManager,
    options: {
      indexStore?: AgentOrgRunHistoryIndexStore;
      treeStore?: AgentOrgRunExecutionTreeStore;
      packageCatalog?: AgentOrgRunPackageCatalog;
      removePackage?: (orgDirPath: string) => Promise<void>;
    } = {},
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.index = options.indexStore ?? new AgentOrgRunHistoryIndexStore(memoryDir);
    this.trees = options.treeStore ?? new AgentOrgRunExecutionTreeStore();
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
        const originalTree = await this.trees.read(identity.orgDirPath, identity.orgRunId);
        if (!originalTree) {
          return { success: false, message: `AgentOrg run execution tree not found for '${identity.orgRunId}'.` };
        }
        const archivedAt = originalTree.archivedAt ?? new Date().toISOString();
        const archivedTree = Object.freeze({ ...originalTree, archivedAt });
        const treeWrite = await this.writeTree(identity, archivedTree);
        if (treeWrite !== "committed") {
          await this.restoreArchiveSnapshot(identity, originalTree, originalRows, originalRow);
          return { success: false, message: `AgentOrg archive change did not commit (${treeWrite}).` };
        }
        const treeReadback = await this.trees.read(identity.orgDirPath, identity.orgRunId).catch(() => null);
        if (!treeReadback || !isDeepStrictEqual(treeReadback, archivedTree)) {
          await this.restoreArchiveSnapshot(identity, originalTree, originalRows, originalRow);
          return { success: false, message: "AgentOrg archive tree readback failed; the prior state was restored." };
        }
        const candidateRows = new Map(originalRows);
        candidateRows.set(identity.orgRunId, projectAgentOrgRunHistoryRow(archivedTree, originalRow));
        try {
          await this.flush(candidateRows);
          const durableRows = await this.index.readIndex();
          if (!this.sameRows(durableRows, candidateRows)) throw new Error("AgentOrg archive index readback mismatch.");
        } catch (error) {
          await this.restoreArchiveSnapshot(identity, originalTree, originalRows, originalRow);
          return { success: false, message: `AgentOrg archive index update failed: ${String(error)}` };
        }
        this.core.publishInQueue(candidateRows);
        return { success: true, message: `AgentOrg run '${identity.orgRunId}' archived.` };
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
        const originalTree = await this.trees.read(identity.orgDirPath, identity.orgRunId);
        if (!originalTree) {
          return { success: false, message: `AgentOrg run execution tree not found for '${identity.orgRunId}'.` };
        }
        const candidateRows = new Map(originalRows);
        candidateRows.delete(identity.orgRunId);
        try {
          await this.flush(candidateRows);
          const durableRows = await this.index.readIndex();
          if (!this.sameRows(durableRows, candidateRows)) throw new Error("AgentOrg delete index readback mismatch.");
        } catch (error) {
          await this.restoreDeleteIndex(identity, originalTree, originalRows, originalRow);
          return { success: false, message: `AgentOrg history index removal failed: ${String(error)}` };
        }
        try {
          await this.removePackage(identity.orgDirPath);
        } catch (error) {
          const retainedTree = await this.trees.read(identity.orgDirPath, identity.orgRunId).catch(() => null);
          if (!retainedTree || !isDeepStrictEqual(retainedTree, originalTree)) {
            throw new Error(`AgentOrg run '${identity.orgRunId}' package removal outcome is indeterminate: ${String(error)}`);
          }
          await this.restoreDeleteIndex(identity, originalTree, originalRows, originalRow);
          return { success: false, message: `AgentOrg run package removal failed: ${String(error)}` };
        }
        const deletedTree = await this.trees.read(identity.orgDirPath, identity.orgRunId).catch((error) => {
          throw new Error(`AgentOrg run '${identity.orgRunId}' package deletion readback is indeterminate: ${String(error)}`);
        });
        if (deletedTree) {
          await this.restoreDeleteIndex(identity, originalTree, originalRows, originalRow);
          return { success: false, message: `AgentOrg run '${identity.orgRunId}' package still exists after deletion.` };
        }
        try { this.packages.exclude(identity.orgRunId, "AgentOrg run history was deleted permanently."); }
        catch (error) {
          throw new Error(`AgentOrg run '${identity.orgRunId}' was deleted, but readiness retirement is indeterminate: ${String(error)}`);
        }
        this.core.publishInQueue(candidateRows);
        return { success: true, message: `AgentOrg run '${identity.orgRunId}' deleted permanently.` };
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
  private async writeTree(
    identity: AgentOrgRunIdentity,
    tree: AgentOrgRunExecutionTreeSnapshot,
  ): Promise<"committed" | "not_renamed" | "renamed_finalization_indeterminate" | "threw"> {
    try { return (await this.trees.write(identity.orgDirPath, tree)).outcome; }
    catch { return "threw"; }
  }
  private async restoreArchiveSnapshot(
    identity: AgentOrgRunIdentity,
    originalTree: AgentOrgRunExecutionTreeSnapshot,
    originalRows: Map<string, AgentOrgRunIndexRowRecord>,
    originalRow: AgentOrgRunIndexRowRecord,
  ): Promise<void> {
    try {
      await this.trees.write(identity.orgDirPath, originalTree);
      await this.flush(originalRows);
      const [tree, rows] = await Promise.all([
        this.trees.read(identity.orgDirPath, identity.orgRunId),
        this.index.readIndex(),
      ]);
      const row = rows.find((candidate) => candidate.orgRunId === identity.orgRunId) ?? null;
      if (!tree || !isDeepStrictEqual(tree, originalTree) || !row || !isDeepStrictEqual(row, originalRow)
        || !this.sameRows(rows, originalRows)) {
        throw new Error("restored AgentOrg archive snapshot did not match the prior state");
      }
    } catch (error) {
      throw new Error(`AgentOrg run '${identity.orgRunId}' archive compensation is indeterminate: ${String(error)}`);
    }
  }
  private async restoreDeleteIndex(
    identity: AgentOrgRunIdentity,
    originalTree: AgentOrgRunExecutionTreeSnapshot,
    originalRows: Map<string, AgentOrgRunIndexRowRecord>,
    originalRow: AgentOrgRunIndexRowRecord,
  ): Promise<void> {
    try {
      await this.flush(originalRows);
      const [tree, rows] = await Promise.all([
        this.trees.read(identity.orgDirPath, identity.orgRunId),
        this.index.readIndex(),
      ]);
      const row = rows.find((candidate) => candidate.orgRunId === identity.orgRunId) ?? null;
      if (!tree || !isDeepStrictEqual(tree, originalTree) || !row || !isDeepStrictEqual(row, originalRow)
        || !this.sameRows(rows, originalRows)) {
        throw new Error("restored AgentOrg delete index did not match the prior state");
      }
    } catch (error) {
      throw new Error(`AgentOrg run '${identity.orgRunId}' delete compensation is indeterminate: ${String(error)}`);
    }
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
