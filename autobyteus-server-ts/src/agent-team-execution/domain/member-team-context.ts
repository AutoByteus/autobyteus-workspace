import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TaskAgentInstanceIdentity } from "./task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "./task-team-instance.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import { createTeamExecutionAddress } from "./team-execution-address.js";
import { MemberCollaborationContext } from "./member-collaboration-context.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/** Team-only binding injected into persistent, restored, and task AgentRuns. */
export class MemberTeamContext {
  readonly teamRunId: string;
  readonly teamDefinitionId: string;
  readonly teamName: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly teamAddress: AgentTeamAddress;
  readonly memberAddress: AgentTeamAddress;
  readonly agentRunId: string;
  readonly runtimeKind: RuntimeKind;
  readonly coordinatorAddress: AgentTeamAddress;
  readonly teamInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;
  readonly executionAddress: TeamExecutionAddress;
  readonly taskAgentInstance: TaskAgentInstanceIdentity | null;
  readonly taskTeamInstance: TaskTeamInstanceIdentity | null;

  constructor(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamName: string;
    teamBackendKind: TeamBackendKind;
    teamAddress: AgentTeamAddress;
    memberAddress: AgentTeamAddress;
    agentRunId: string;
    runtimeKind: RuntimeKind;
    coordinatorAddress: AgentTeamAddress;
    teamInstruction?: string | null;
    collaboration: MemberCollaborationContext;
    executionAddress: TeamExecutionAddress;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
  }) {
    this.teamRunId = input.teamRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamName = input.teamName;
    this.teamBackendKind = input.teamBackendKind;
    this.teamAddress = input.teamAddress;
    this.memberAddress = input.memberAddress;
    this.agentRunId = input.agentRunId;
    this.runtimeKind = input.runtimeKind;
    this.coordinatorAddress = input.coordinatorAddress;
    this.teamInstruction = input.teamInstruction ?? null;
    this.collaboration = new MemberCollaborationContext(input.collaboration);
    this.executionAddress = createTeamExecutionAddress(input.executionAddress);
    this.taskAgentInstance = input.taskAgentInstance ?? null;
    this.taskTeamInstance = input.taskTeamInstance ?? null;
    Object.freeze(this);
  }
}
