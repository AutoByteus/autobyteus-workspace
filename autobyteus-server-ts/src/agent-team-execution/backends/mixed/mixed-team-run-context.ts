import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AgentMemoryScope } from "../../../agent-memory/domain/agent-memory-location.js";
import type { AgentMemberTeamDescriptor } from "../../domain/member-team-context.js";
import type {
  InterAgentMessageDeliveryHandler,
  TeamRepresentedSubTeam,
} from "../../domain/inter-agent-message-delivery.js";
import type { TaskTeamInstanceIdentity } from "../../domain/task-team-instance.js";
import type { TokenUsageTeamExecutionScope } from "../../domain/token-usage-execution-scope.js";
import { cloneTokenUsageTeamExecutionScope } from "../../domain/token-usage-execution-scope.js";
import type {
  TeamAgentMemberRuntimeContext,
  TeamMemberRuntimeContext,
  TeamRunContext,
  TeamSubTeamMemberRuntimeContext,
} from "../../domain/team-run-context.js";

export type MixedAgentMemberContextInput = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
};

export class MixedAgentMemberContext implements TeamAgentMemberRuntimeContext {
  readonly memberKind = "agent" as const;
  readonly memberName: string;
  readonly memberPath: string[];
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;

  constructor(input: MixedAgentMemberContextInput) {
    this.memberName = input.memberName;
    this.memberPath = [...input.memberPath];
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.runtimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
  }

  getPlatformAgentRunId(): string | null {
    return this.platformAgentRunId;
  }
}

export type MixedSubTeamMemberContextInput = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId: string | null;
  childRuntimeContext?: MixedTeamRunContext | null;
};

export class MixedSubTeamMemberContext implements TeamSubTeamMemberRuntimeContext {
  readonly memberKind = "agent_team" as const;
  readonly memberName: string;
  readonly memberPath: string[];
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly teamDefinitionId: string;
  childTeamRunId: string | null;
  childRuntimeContext: MixedTeamRunContext | null = null;

  constructor(input: MixedSubTeamMemberContextInput) {
    this.memberName = input.memberName;
    this.memberPath = [...input.memberPath];
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.childTeamRunId = input.childTeamRunId;
    this.childRuntimeContext = input.childRuntimeContext ?? null;
  }

  getPlatformAgentRunId(): string | null {
    return null;
  }
}

export type MixedTeamMemberContext = MixedAgentMemberContext | MixedSubTeamMemberContext;

export type MixedParentBoundaryContext = {
  parentTeamRunId: string;
  parentTeamDefinitionId?: string | null;
  parentTeamName?: string | null;
  memoryScope?: AgentMemoryScope | null;
  representedSubTeam: TeamRepresentedSubTeam;
  parentMembers: AgentMemberTeamDescriptor[];
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
};

export type MixedTeamRunContextInput = {
  coordinatorMemberRouteKey: string | null;
  memberContexts: MixedTeamMemberContext[];
  parentBoundary?: MixedParentBoundaryContext | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  tokenUsageTeamScope?: TokenUsageTeamExecutionScope | null;
};

export class MixedTeamRunContext {
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberContexts: MixedTeamMemberContext[];
  readonly parentBoundary: MixedParentBoundaryContext | null;
  readonly taskTeamInstance: TaskTeamInstanceIdentity | null;
  readonly tokenUsageTeamScope: TokenUsageTeamExecutionScope;

  constructor(input: MixedTeamRunContextInput) {
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey;
    this.memberContexts = [...input.memberContexts];
    this.parentBoundary = input.parentBoundary ?? null;
    this.taskTeamInstance = input.taskTeamInstance ?? null;
    this.tokenUsageTeamScope = input.tokenUsageTeamScope
      ? cloneTokenUsageTeamExecutionScope(input.tokenUsageTeamScope)
      : { rootTeamRunId: "", teamScopeAddress: { segments: [] } };
  }
}

export type MixedTeamRunContextEnvelope = TeamRunContext<MixedTeamRunContext>;
