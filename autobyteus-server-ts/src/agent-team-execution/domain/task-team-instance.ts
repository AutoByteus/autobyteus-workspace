import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "./team-run-config.js";

export type TaskTeamInstanceIdentity = Readonly<{
  taskTeamInstanceId: string;
  taskTeamRunId: string;
  parentTeamRunId: string;
  taskId: string;
  createdAt: string;
}>;

export type StartTaskTeamInstanceRequest = Readonly<{
  identity: TaskTeamInstanceIdentity;
  receiver: TeamExecutionAddress;
  config: TeamRunConfig;
  teamNode: TeamRunAgentTeamNode;
  message: AgentInputUserMessage;
}>;

export const cloneTaskTeamInstanceIdentity = (
  identity: TaskTeamInstanceIdentity,
): TaskTeamInstanceIdentity => Object.freeze({ ...identity });
