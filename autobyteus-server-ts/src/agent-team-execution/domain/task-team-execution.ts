import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunAgentTeamNode } from "./team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";

/** Exact local preparation input selected by the root task owner. */
export type PrepareTaskTeamInput = Readonly<{
  taskId: string;
  address: AgentTeamAddress;
  teamRunId: string;
  handoffs: readonly CollaborationHandoff[];
  teamNode: TeamRunAgentTeamNode;
  message: AgentInputUserMessage;
}>;
