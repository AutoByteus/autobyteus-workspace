import path from "node:path";
import type { AgentRunHistoryIndexRowRecord } from "../store/agent-run-history-index-record-types.js";

/**
 * The agent run history catalog's state, one per memory folder (its rows, its load, its one ordered queue), shared by every
 * `AgentRunHistoryCatalogService` over that folder.
 */
export type CatalogState = {
  initialized: boolean;
  initPromise: Promise<void> | null;
  rows: Map<string, AgentRunHistoryIndexRowRecord>;
  queue: Promise<void>;
};

const catalogStates = new Map<string, CatalogState>();

export const getState = (memoryDir: string): CatalogState => {
  const key = path.resolve(memoryDir);
  const existing = catalogStates.get(key);
  if (existing) {
    return existing;
  }
  const created: CatalogState = {
    initialized: false,
    initPromise: null,
    rows: new Map(),
    queue: Promise.resolve(),
  };
  catalogStates.set(key, created);
  return created;
};

export const resetAgentRunHistoryCatalogState = (memoryDir: string): void => {
  const state = catalogStates.get(path.resolve(memoryDir));
  if (!state) {
    return;
  }
  state.initialized = false;
  state.initPromise = null;
  state.rows = new Map();
};

export const cloneRows = (
  rows: Map<string, AgentRunHistoryIndexRowRecord>,
): Map<string, AgentRunHistoryIndexRowRecord> =>
  new Map(Array.from(rows.entries()).map(([runId, row]) => [runId, { ...row }]));

