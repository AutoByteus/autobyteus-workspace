import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AgentMemoryScope } from "../../../agent-memory/domain/agent-memory-location.js";
import type { InterAgentMessageDeliveryHandler } from "../../domain/inter-agent-message-delivery.js";
import type { TeamExecutionAddress } from "../../domain/team-execution-address.js";
import type {
  TeamAgentMemberRuntimeContext,
  TeamRunContext,
  TeamSubTeamMemberRuntimeContext,
} from "../../domain/team-run-context.js";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";

export class MixedAgentMemberContext implements TeamAgentMemberRuntimeContext {
  readonly kind = "agent" as const;
  readonly address: AgentTeamAddress;
  readonly agentRunId: string;
  readonly runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;

  constructor(input: {
    address: AgentTeamAddress;
    agentRunId: string;
    runtimeKind: RuntimeKind;
    platformAgentRunId: string | null;
  }) {
    this.address = input.address;
    this.agentRunId = input.agentRunId;
    this.runtimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
  }
  getPlatformAgentRunId(): string | null { return this.platformAgentRunId; }
}

export class MixedSubTeamMemberContext implements TeamSubTeamMemberRuntimeContext {
  readonly kind = "agent_team" as const;
  readonly address: AgentTeamAddress;
  readonly teamDefinitionId: string;
  readonly teamRunId: string;
  childRuntimeContext: MixedTeamRunContext | null;

  constructor(input: {
    address: AgentTeamAddress;
    teamDefinitionId: string;
    teamRunId: string;
    childRuntimeContext?: MixedTeamRunContext | null;
  }) {
    this.address = input.address;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamRunId = input.teamRunId;
    this.childRuntimeContext = input.childRuntimeContext ?? null;
  }
  getPlatformAgentRunId(): null { return null; }
}

export type MixedTeamMemberContext = MixedAgentMemberContext | MixedSubTeamMemberContext;

export type MixedParentBoundaryContext = Readonly<{
  parentTeamRunId: string;
  memoryScope?: AgentMemoryScope | null;
  rootTeamRunId: string;
  parentTeamAddress: AgentTeamAddress;
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
}>;

export class MixedTeamRunContext {
  readonly memberContexts: MixedTeamMemberContext[];
  readonly parentBoundary: MixedParentBoundaryContext | null;
  readonly taskId: string | null;
  readonly teamExecutionAddress: TeamExecutionAddress;

  constructor(input: {
    memberContexts: MixedTeamMemberContext[];
    parentBoundary?: MixedParentBoundaryContext | null;
    taskId?: string | null;
    teamExecutionAddress: TeamExecutionAddress;
  }) {
    this.memberContexts = [...input.memberContexts];
    this.parentBoundary = input.parentBoundary ?? null;
    this.taskId = input.taskId?.trim() || null;
    this.teamExecutionAddress = input.teamExecutionAddress;
  }
}

export type MixedTeamRunContextEnvelope = TeamRunContext<MixedTeamRunContext>;
