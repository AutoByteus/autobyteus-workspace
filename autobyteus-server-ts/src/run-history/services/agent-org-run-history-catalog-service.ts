import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";
import { AgentOrgRunHistoryIndexStore } from "../store/agent-org-run-history-index-store.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunPackageCatalog } from "./agent-org-run-package-catalog.js";
import { AgentOrgRunHistorySummaryWriter } from "./agent-org-run-history-summary-writer.js";
import { projectAgentOrgRunHistoryRow } from "./agent-org-run-history-row-projector.js";

/** Derived AgentOrg history authority. Runtime/history reads never consult live definitions. */
export class AgentOrgRunHistoryCatalogService {
  private readonly layout: AgentMemoryLayout;
  private readonly index: AgentOrgRunHistoryIndexStore;
  private readonly trees: AgentOrgRunExecutionTreeStore;
  private readonly packages: AgentOrgRunPackageCatalog;
  private readonly summaryWriter: AgentOrgRunHistorySummaryWriter;
  private rows = new Map<string, AgentOrgRunIndexRowRecord>();
  private initialized = false;
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly memoryDir: string, private readonly manager: Pick<AgentOrgRunManager, "getActive">, options: {
    indexStore?: AgentOrgRunHistoryIndexStore;
    treeStore?: AgentOrgRunExecutionTreeStore;
    packageCatalog?: AgentOrgRunPackageCatalog;
    summaryWriter?: AgentOrgRunHistorySummaryWriter;
  } = {}) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.index = options.indexStore ?? new AgentOrgRunHistoryIndexStore(memoryDir);
    this.trees = options.treeStore ?? new AgentOrgRunExecutionTreeStore();
    this.packages = options.packageCatalog ?? new AgentOrgRunPackageCatalog(memoryDir);
    this.summaryWriter = options.summaryWriter ?? new AgentOrgRunHistorySummaryWriter(this.index);
  }
  async listRows(): Promise<readonly AgentOrgRunIndexRowRecord[]> {
    await this.ensureInitialized();
    return Object.freeze([...this.rows.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  }
  async initialize(): Promise<void> { await this.ensureInitialized(); }
  async recordCreated(tree: AgentOrgRunExecutionTreeSnapshot): Promise<void> { await this.upsert(tree, false); }
  async recordRestored(tree: AgentOrgRunExecutionTreeSnapshot): Promise<void> { await this.upsert(tree, true); }
  async recordRunSummary(input: Readonly<{ orgRunId: string; summary?: string | null }>): Promise<void> {
    await this.ensureInitialized();
    await this.withQueue(async () => {
      const result = await this.summaryWriter.commitFirstNonEmpty({
        rows: [...this.rows.values()],
        orgRunId: input.orgRunId,
        summary: input.summary,
      });
      if (result.disposition === "MISSING_ROW") {
        throw new Error(`AgentOrg run '${input.orgRunId}' is missing from current history.`);
      }
      if (result.disposition === "WRITTEN") {
        this.rows = new Map(result.rows.map((row) => [row.orgRunId, row]));
      }
    });
  }
  async recordTerminated(orgRunId: string, terminatedAt = new Date().toISOString()): Promise<void> {
    await this.mutate(async (rows) => {
      const current = rows.get(orgRunId);
      if (current) rows.set(orgRunId, Object.freeze({ ...current, terminatedAt }));
    });
  }
  async deleteStored(orgRunId: string): Promise<{ success: boolean; message: string }> {
    await this.ensureInitialized();
    if (this.manager.getActive(orgRunId)) return { success: false, message: "AgentOrg run is active. Terminate it before deleting history." };
    return this.withQueue(async () => {
      if (!this.rows.has(orgRunId)) return { success: false, message: `AgentOrg run '${orgRunId}' was not found.` };
      const next = new Map(this.rows); next.delete(orgRunId);
      await this.index.writeIndex([...next.values()]);
      try { await fs.rm(this.layout.getOrgDirPath(orgRunId), { recursive: true, force: true }); }
      catch (error) { await this.index.writeIndex([...this.rows.values()]); return { success: false, message: String(error) }; }
      this.rows = next;
      this.packages.exclude(orgRunId, "AgentOrg run history was deleted permanently.");
      return { success: true, message: `AgentOrg run '${orgRunId}' deleted permanently.` };
    });
  }
  private async upsert(tree: AgentOrgRunExecutionTreeSnapshot, restored: boolean): Promise<void> {
    await this.mutate(async (rows) => {
      const existing = rows.get(tree.rootOrg.orgRunId) ?? null;
      if (existing && !restored) throw new Error(`AgentOrg run '${tree.rootOrg.orgRunId}' already exists in history.`);
      rows.set(tree.rootOrg.orgRunId, Object.freeze({ ...projectAgentOrgRunHistoryRow(tree, existing), terminatedAt: restored ? null : existing?.terminatedAt ?? null }));
    });
  }
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.withQueue(async () => {
      if (this.initialized) return;
      await this.packages.awaitReady();
      const persisted = new Map((await this.index.readIndex()).map((row) => [row.orgRunId, row]));
      const next = new Map<string, AgentOrgRunIndexRowRecord>();
      for (const orgRunId of this.packages.listAdmitted()) {
        const tree = await this.trees.read(this.layout.getOrgDirPath(orgRunId), orgRunId);
        if (tree) next.set(orgRunId, projectAgentOrgRunHistoryRow(tree, persisted.get(orgRunId)));
      }
      this.rows = next;
      await this.index.writeIndex([...next.values()]);
      this.initialized = true;
    });
  }
  private async mutate(operation: (rows: Map<string, AgentOrgRunIndexRowRecord>) => Promise<void>): Promise<void> {
    await this.ensureInitialized();
    await this.withQueue(async () => {
      const rows = new Map(this.rows); await operation(rows); await this.index.writeIndex([...rows.values()]); this.rows = rows;
    });
  }
  private async withQueue<T>(operation: () => Promise<T>): Promise<T> {
    let value!: T;
    const next = this.queue.then(async () => { value = await operation(); }, async () => { value = await operation(); });
    this.queue = next.then(() => undefined, () => undefined);
    await next; return value;
  }
}
