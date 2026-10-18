// Frozen verbatim copy (import paths remapped only) of `src/standalone-agent-run-root/domain/standalone-root-tree.ts` as of the
// D-10 rename commit 8bbd081c8d (behavior identical to origin/personal@66429d6f31). Owned by
// released app-data migrations and `20261017_task_agent_own_run_v1`; current runtime must not import it.
// The message-log envelope moved to `../released-message-logs-before-append-only.ts`.

import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type {
  IsoTimestamp,
  TaskExecution,
} from "./run-execution-tree-shared-records.js";

/** The standalone AgentRun that hosts an Agent root. Its own run data stays in `run_metadata.json`. */
export type StandaloneRootHost = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  agentDefinitionId: string;
}>;

/**
 * `memory/agents/<hostRunId>/collaboration/collaboration_tree.json`: created on the first
 * delegation. Read tolerantly, written exactly. Every task execution is hosted by the root and
 * carries the catalog source it was started from.
 */
export type StandaloneRootTreeFile = Readonly<{
  subjectKind: "agent";
  createdAt: IsoTimestamp;
  host: StandaloneRootHost;
  taskExecutions: readonly TaskExecution[];
}>;

export type StandaloneRootTreeSnapshot = StandaloneRootTreeFile;

export const emptyStandaloneRootTree = (input: Readonly<{
  host: StandaloneRootHost;
  createdAt: IsoTimestamp;
}>): StandaloneRootTreeSnapshot => Object.freeze({
  subjectKind: "agent",
  createdAt: input.createdAt,
  host: Object.freeze({ ...input.host }),
  taskExecutions: Object.freeze([]),
});
