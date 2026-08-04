import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { cloneTaskAgentInstanceIdentity, type TaskAgentInstanceIdentity } from "../../../agent-team-execution/domain/task-agent-instance.js";
import { cloneTaskTeamInstanceIdentity, type TaskTeamInstanceIdentity } from "../../../agent-team-execution/domain/task-team-instance.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../../agent-team-execution/domain/team-execution-address.js";

export type AutoByteusManagedTeamContext = Readonly<{
  teamRunId: string;
  teamDefinitionId: string;
  teamName: string;
  teamAddress: AgentTeamAddress;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
  coordinatorAddress: AgentTeamAddress;
  executionAddress: TeamExecutionAddress;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  taskTeamInstance: TaskTeamInstanceIdentity | null;
}>;

export const buildAutoByteusManagedTeamContext = (context: MemberTeamContext): AutoByteusManagedTeamContext => Object.freeze({
  teamRunId: context.teamRunId,
  teamDefinitionId: context.teamDefinitionId,
  teamName: context.teamName,
  teamAddress: context.teamAddress,
  memberAddress: context.memberAddress,
  agentRunId: context.agentRunId,
  coordinatorAddress: context.coordinatorAddress,
  executionAddress: createTeamExecutionAddress(context.executionAddress),
  taskAgentInstance: context.taskAgentInstance ? cloneTaskAgentInstanceIdentity(context.taskAgentInstance) : null,
  taskTeamInstance: context.taskTeamInstance ? cloneTaskTeamInstanceIdentity(context.taskTeamInstance) : null,
});
