/**
 * The port through which a migration that rewrote a run-history index tells the application to drop its in-memory
 * view of that index. The registry passes one that resets the live run-history catalogs.
 */
export type RunHistoryCatalogInvalidation = {
  /** The standalone agent run-history index under `memoryDir` changed. */
  agentRunHistoryChanged(memoryDir: string): void;
  /** The team or organization run-history index under `memoryDir` changed. */
  collaborationRunHistoryChanged(memoryDir: string, family: "agent_team" | "agent_org"): void;
};
