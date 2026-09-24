import path from "node:path";
import { compactSummary } from "./run-history-service-helpers.js";

export type CollaborationHistoryFamily = "agent_team" | "agent_org";

type RowState<Row> = {
  rows: Map<string, Row>;
  initialized: boolean;
  initPromise: Promise<void> | null;
  queue: Promise<void>;
};

// The registry contains only index rows and serialization state. It must never
// retain a service instance, tree store, manager, or imported-memory selector.
const states = new Map<string, RowState<unknown>>();
const stateKey = (memoryDir: string, family: CollaborationHistoryFamily): string =>
  `${path.resolve(memoryDir)}\0${family}`;

export const resetCollaborationRunHistoryCatalogState = (
  memoryDir: string,
  family: CollaborationHistoryFamily,
): void => {
  const key = stateKey(memoryDir, family);
  const existing = states.get(key);
  if (existing) {
    existing.initialized = false;
    existing.initPromise = null;
    existing.rows = new Map();
  }
  // Keep the shared queue object for existing service instances. A migration
  // invalidates their view as well as the next instance's view.
};

export class CollaborationRunHistoryCatalogCore<Row extends { summary: string; createdAt: string }> {
  private readonly state: RowState<Row>;

  constructor(memoryDir: string, family: CollaborationHistoryFamily, private readonly adapter: {
    idOf: (row: Row) => string;
    readRows: () => Promise<readonly Row[]>;
    writeRows: (rows: readonly Row[]) => Promise<void>;
    awaitReady: () => Promise<void>;
    isAdmitted: (id: string) => boolean;
  }) {
    const key = stateKey(memoryDir, family);
    let state = states.get(key) as RowState<Row> | undefined;
    if (!state) {
      state = { rows: new Map(), initialized: false, initPromise: null, queue: Promise.resolve() };
      states.set(key, state as RowState<unknown>);
    }
    this.state = state;
  }

  async ensureInitialized(): Promise<void> {
    if (this.state.initialized) return;
    this.state.initPromise ??= this.adapter.awaitReady().then(() => this.adapter.readRows())
      .then((rows) => {
        // Keep unadmitted persisted rows. Admission is an exposure policy, not
        // permission to discard them on the next unrelated lifecycle write.
        this.state.rows = new Map(rows.map((row) => [this.adapter.idOf(row), row]));
        this.state.initialized = true;
      }).catch((error) => { this.state.initPromise = null; throw error; });
    await this.state.initPromise;
  }

  async listCatalogRows(): Promise<readonly Row[]> {
    await this.ensureInitialized();
    return Object.freeze(this.sorted(this.state.rows, true));
  }

  async getCatalogRow(id: string): Promise<Row | null> {
    await this.ensureInitialized();
    const row = this.state.rows.get(id.trim());
    return row && this.adapter.isAdmitted(id.trim()) ? this.snapshot(row) : null;
  }

  // Callers must acquire this family queue before any per-root manager lane.
  async withQueue<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    const next = this.state.queue.then(operation, operation);
    this.state.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async recordFirstSummary(id: string, value: string | null | undefined,
    onMissing?: (id: string) => void): Promise<void> {
    const summary = compactSummary(value ?? null);
    await this.withQueue(async () => {
      const rows = this.rowsInQueue();
      const current = rows.get(id);
      if (!current) { onMissing?.(id); return; }
      if (!summary || compactSummary(current.summary)) return;
      rows.set(id, { ...current, summary });
      await this.commitInQueue(rows);
    });
  }

  rowsInQueue(): Map<string, Row> { return new Map(this.state.rows); }

  async commitInQueue(rows: Map<string, Row>): Promise<void> {
    await this.adapter.writeRows(this.sorted(rows, false));
    this.state.rows = rows;
  }

  async writeCandidateInQueue(rows: Map<string, Row>): Promise<void> {
    await this.adapter.writeRows(this.sorted(rows, false));
  }

  publishInQueue(rows: Map<string, Row>): void { this.state.rows = rows; }

  static compactSummary(summary: string | null | undefined): string {
    return compactSummary(summary ?? null);
  }

  private snapshot(row: Row): Row {
    return Object.freeze({ ...row, summary: compactSummary(row.summary) });
  }

  private sorted(rows: Map<string, Row>, admittedOnly: boolean): Row[] {
    return [...rows.values()]
      .filter((row) => !admittedOnly || this.adapter.isAdmitted(this.adapter.idOf(row)))
      .map((row) => admittedOnly ? this.snapshot(row) : row)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
