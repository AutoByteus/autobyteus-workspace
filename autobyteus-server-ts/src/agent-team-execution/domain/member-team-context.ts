import type { TaskAgentInstanceIdentity } from "./task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "./task-team-instance.js";
import type { TokenUsageExecutionScope } from "./token-usage-execution-scope.js";
import { cloneTokenUsageExecutionScope } from "./token-usage-execution-scope.js";
import { MemberCollaborationContext } from "./member-collaboration-context.js";
import type { TeamBackendKind } from "./team-backend-kind.js";

/** Minimal team binding injected into every persistent, restored, and task AgentRun. */
export class MemberTeamContext {
  readonly teamRunId: string;
  readonly teamDefinitionId: string;
  readonly teamName: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly memberName: string;
  readonly memberPath: string[];
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly coordinatorMemberRouteKey: string | null;
  readonly teamInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;
  readonly sendMessageToEnabled: boolean;
  readonly taskAgentInstance: TaskAgentInstanceIdentity | null;
  readonly taskTeamInstance: TaskTeamInstanceIdentity | null;
  readonly tokenUsageExecutionScope: TokenUsageExecutionScope | null;

  constructor(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamName?: string | null;
    teamBackendKind: TeamBackendKind;
    memberName: string;
    memberPath?: string[] | null;
    memberRouteKey: string;
    memberRunId: string;
    coordinatorMemberRouteKey?: string | null;
    teamInstruction?: string | null;
    collaboration: MemberCollaborationContext;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
    tokenUsageExecutionScope?: TokenUsageExecutionScope | null;
  }) {
    this.teamRunId = input.teamRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamName = input.teamName?.trim() || input.teamDefinitionId;
    this.teamBackendKind = input.teamBackendKind;
    this.memberName = input.memberName;
    this.memberPath = input.memberPath?.length ? [...input.memberPath] : [input.memberName];
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey?.trim() || null;
    this.teamInstruction = input.teamInstruction ?? null;
    this.collaboration = new MemberCollaborationContext(input.collaboration);
    this.sendMessageToEnabled = Boolean(this.collaboration.deliverInterAgentMessage);
    this.taskAgentInstance = input.taskAgentInstance ?? null;
    this.taskTeamInstance = input.taskTeamInstance ?? null;
    this.tokenUsageExecutionScope = input.tokenUsageExecutionScope
      ? cloneTokenUsageExecutionScope(input.tokenUsageExecutionScope)
      : null;
  }
}
