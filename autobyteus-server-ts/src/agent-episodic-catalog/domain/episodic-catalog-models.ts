import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/** One journal file of a catalog entry: its name, the time range its header states (UTC minutes) and its size. */
export type CatalogJournalFile = Readonly<{
  name: string;
  from: string | null;
  to: string | null;
  sizeBytes: number;
}>;

/**
 * One run in an agent's episodic catalog (contract §2.2): only what an agent needs to choose and open its past work.
 * Times are UTC, `YYYY-MM-DD HH:MM`. Kept in memory and rendered to Markdown; never read back from a catalog file.
 */
export type CatalogEntry = Readonly<{
  runId: string;
  /** The run's folder: where "no journal yet" points. */
  memoryDir: string;
  /** The root whose refresh or delete replaces this entry. Never rendered. */
  root: RootExecutionIdentity;
  /** The run's agent name as discovery reports it; it names the catalog when the run is the newest (§2.3). Never rendered in the entry. */
  agentName: string;
  /** The first journal file's start, else the start the run's records hold; null renders "start unknown". */
  startedAt: string | null;
  /** The last journal file's end; null when no journal file states a time. */
  lastActivityAt: string | null;
  taskTitle: string | null;
  workspace: string | null;
  /** The run's `work_journal` folder and its files in manifest order; null renders "no journal yet". */
  journal: Readonly<{ folder: string; files: readonly CatalogJournalFile[] }> | null;
}>;

/** One agent definition's catalog: its definition ID and the entries of its runs on this node (any order). */
export type AgentCatalog = Readonly<{
  agentDefinitionId: string;
  /** The folder name under `episodic/`: the encoded definition ID. */
  folderName: string;
  entries: readonly CatalogEntry[];
}>;
