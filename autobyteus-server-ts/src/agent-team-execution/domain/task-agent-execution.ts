import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunAgentNode } from "./team-run-config.js";

/** Exact local preparation input selected by the root task owner. */
export type PrepareTaskAgentInput = Readonly<{
  taskId: string;
  address: AgentTeamAddress;
  agentRunId: string;
  sourceNode: TeamRunAgentNode;
  message: AgentInputUserMessage;
}>;
