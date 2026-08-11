import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "./team-run-config.js";

/** Runtime-start input. Concrete identity is carried only by receiver/config. */
export type StartTaskTeamExecutionRequest = Readonly<{
  taskId: string;
  receiver: TeamExecutionAddress;
  config: TeamRunConfig;
  teamNode: TeamRunAgentTeamNode;
  message: AgentInputUserMessage;
}>;
