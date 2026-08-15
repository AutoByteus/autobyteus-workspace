import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
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
  constructor(input: { address: AgentTeamAddress; agentRunId: string; runtimeKind: RuntimeKind; platformAgentRunId: string | null }) {
    Object.assign(this, input);
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
  constructor(input: { address: AgentTeamAddress; teamDefinitionId: string; teamRunId: string; childRuntimeContext?: MixedTeamRunContext | null }) {
    this.address = input.address;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamRunId = input.teamRunId;
    this.childRuntimeContext = input.childRuntimeContext ?? null;
  }
  getPlatformAgentRunId(): null { return null; }
}

export type MixedTeamMemberContext = MixedAgentMemberContext | MixedSubTeamMemberContext;

export class MixedTeamRunContext {
  readonly memberContexts: MixedTeamMemberContext[];
  constructor(input: { memberContexts: MixedTeamMemberContext[] }) {
    this.memberContexts = [...input.memberContexts];
  }
}

export type MixedTeamRunContextEnvelope = TeamRunContext<MixedTeamRunContext>;
