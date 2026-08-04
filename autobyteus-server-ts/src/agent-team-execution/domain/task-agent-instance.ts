import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import type { TeamRunAgentNode } from "./team-run-config.js";

export type TaskAgentInstanceIdentity = Readonly<{
  taskAgentInstanceId: string;
  taskAgentRunId: string;
  owningTeamRunId: string;
  taskId: string;
  createdAt: string;
}>;

export type StartTaskAgentInstanceRequest = Readonly<{
  identity: TaskAgentInstanceIdentity;
  receiver: TeamExecutionAddress;
  sourceNode: TeamRunAgentNode;
  message: AgentInputUserMessage;
}>;

export const cloneTaskAgentInstanceIdentity = (
  identity: TaskAgentInstanceIdentity,
): TaskAgentInstanceIdentity => Object.freeze({ ...identity });
