import path from "node:path";
import type { AgentRunHistoryIndexRowRecord } from "../store/agent-run-history-index-record-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { compactSummary } from "./run-history-service-helpers.js";

/** The process-wide in-memory catalog of standalone run history rows, one per memory root, and its row helpers. */
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

export const normalizeRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: row.runId.trim(),
  agentDefinitionId: row.agentDefinitionId.trim(),
  agentName: row.agentName.trim() || row.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
  summary: compactSummary(row.summary),
  createdAt: row.createdAt,
  archivedAt: row.archivedAt ?? null,
  terminatedAt: row.terminatedAt ?? null,
  ...(row.hasCollaboration === true ? { hasCollaboration: true as const } : {}),
});

export const cloneRows = (
  rows: Map<string, AgentRunHistoryIndexRowRecord>,
): Map<string, AgentRunHistoryIndexRowRecord> =>
  new Map(Array.from(rows.entries()).map(([runId, row]) => [runId, { ...row }]));
