import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import {
  cloneMemberLogicalAddressContext,
  type MemberLogicalAddressContext,
} from "../../../agent-team-execution/domain/member-logical-address-context.js";
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
  addressing: MemberLogicalAddressContext;
  taskId: string | null;
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
  addressing: cloneMemberLogicalAddressContext(context.collaboration.addressing),
  taskId: context.taskId,
});
