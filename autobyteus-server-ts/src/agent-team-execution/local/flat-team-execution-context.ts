import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  TeamAgentMemberRuntimeContext,
  TeamRunContext,
} from "../domain/team-run-context.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export type ConfiguredMemberActivationMode = "fresh" | "restore";

export class FlatAgentExecutionContext implements TeamAgentMemberRuntimeContext {
  readonly kind = "agent" as const;
  readonly address: AgentTeamAddress;
  readonly agentRunId: string;
  readonly runtimeKind: RuntimeKind;
  private platformAgentRunId: string | null;
  constructor(input: { address: AgentTeamAddress; agentRunId: string; runtimeKind: RuntimeKind; platformAgentRunId: string | null }) {
    Object.assign(this, input);
    this.address = input.address;
    this.agentRunId = input.agentRunId;
    this.runtimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
  }
  getPlatformAgentRunId(): string | null { return this.platformAgentRunId; }
  replaceCommittedPlatformAgentRunId(expectedPrevious: string, platformAgentRunId: string): void {
    const normalized = platformAgentRunId.trim();
    if (!normalized || normalized === expectedPrevious || this.platformAgentRunId !== expectedPrevious) {
      throw new Error("Flat Team Agent committed provider replacement does not match the expected binding.");
    }
    this.platformAgentRunId = normalized;
  }
  adoptPlatformAgentRunId(platformAgentRunId: string): void {
    const normalized = platformAgentRunId.trim();
    if (!normalized) throw new Error("platformAgentRunId is required.");
    if (this.platformAgentRunId && this.platformAgentRunId !== normalized) {
      throw new Error("Flat Team Agent execution already has a different provider binding.");
    }
    this.platformAgentRunId = normalized;
  }
}

export type FlatTeamMemberExecutionContext = FlatAgentExecutionContext;

export class FlatTeamExecutionContext {
  readonly memberContexts: FlatTeamMemberExecutionContext[];
  readonly configuredMemberActivationMode: ConfiguredMemberActivationMode;
  constructor(input: {
    memberContexts: FlatTeamMemberExecutionContext[];
    configuredMemberActivationMode: ConfiguredMemberActivationMode;
  }) {
    this.memberContexts = [...input.memberContexts];
    this.configuredMemberActivationMode = input.configuredMemberActivationMode;
  }
}

export type FlatTeamExecutionContextEnvelope = TeamRunContext<FlatTeamExecutionContext>;
