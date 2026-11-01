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
  private currentRuntimeKind: RuntimeKind;
  private platformAgentRunId: string | null;
  constructor(input: { address: AgentTeamAddress; agentRunId: string; runtimeKind: RuntimeKind; platformAgentRunId: string | null }) {
    this.address = input.address;
    this.agentRunId = input.agentRunId;
    this.currentRuntimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
  }
  get runtimeKind(): RuntimeKind { return this.currentRuntimeKind; }
  getPlatformAgentRunId(): string | null { return this.platformAgentRunId; }
  replaceCommittedPlatformAgentRunId(expectedPrevious: string, platformAgentRunId: string): void {
    const normalized = platformAgentRunId.trim();
    if (!normalized || normalized === expectedPrevious || this.platformAgentRunId !== expectedPrevious) {
      throw new Error("Flat Team Agent committed provider replacement does not match the expected binding.");
    }
    this.platformAgentRunId = normalized;
  }
  /**
   * A switched member's committed state, or a restore's refresh of a retained member: its agent runtime and session ID, which
   * may be none (the native agent runtime has no provider session).
   */
  refreshSelection(selection: { runtimeKind: RuntimeKind; platformAgentRunId: string | null }): void {
    this.currentRuntimeKind = selection.runtimeKind;
    this.platformAgentRunId = selection.platformAgentRunId?.trim() || null;
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
