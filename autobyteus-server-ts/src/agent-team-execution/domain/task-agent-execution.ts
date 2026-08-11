import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import type { TeamRunAgentNode } from "./team-run-config.js";

/** Runtime-start input. Concrete identity is carried only by receiver. */
export type StartTaskAgentExecutionRequest = Readonly<{
  taskId: string;
  receiver: TeamExecutionAddress;
  sourceNode: TeamRunAgentNode;
  message: AgentInputUserMessage;
}>;
