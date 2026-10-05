import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunAgentTeamNode } from "./team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";

/** Exact local preparation input selected by the root task-execution owner. */
export type PrepareTaskTeamInput = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  handoffs: readonly CollaborationHandoff[];
  teamNode: TeamRunAgentTeamNode;
  message?: AgentInputUserMessage;
}>;

/** Deterministic restore node (persisted IDs) for one shut-down task Team. */
export type RestoreTaskTeamInput = Readonly<{
  assertOpen(): void;
  handoffs: readonly CollaborationHandoff[];
  teamNode: TeamRunAgentTeamNode;
}>;
