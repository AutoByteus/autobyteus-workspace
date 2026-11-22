import type { CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { LiveAgentInputSnapshot } from "../../agent-collaboration/execution/domain/live-agent-input-snapshot.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";

/** An Org's own view parts (today's Org view shape, DEC-004): its tree, its agents' statuses and their input states. */
export type AgentOrgRunPackageSnapshot = Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  statuses: readonly CollaborationAgentStatusSnapshot[];
  inputStates: readonly LiveAgentInputSnapshot[];
}>;
