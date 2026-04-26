import type {
  ChannelBinding,
  ChannelDispatchTarget,
  ChannelBindingLookup,
  ChannelRunOutputTarget,
  ChannelSourceRoute,
  ResolvedBinding,
  UpsertChannelBindingInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "../providers/channel-binding-provider.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { publishChannelBindingLifecycleEvent } from "./channel-binding-lifecycle-events.js";
import {
  resolveTeamBindingCurrentOutputIdentity,
  type ChannelTeamOutputTargetIdentity,
} from "./channel-team-output-target-identity.js";

export type ChannelBindingServiceOptions = {
  allowTransportFallback?: boolean;
};

export type ChannelBindingServiceDependencies = {
  teamRunService?: Pick<TeamRunService, "resolveTeamRun">;
};

export class ChannelBindingService {
  private readonly allowTransportFallback: boolean;
  private teamRunService: Pick<TeamRunService, "resolveTeamRun"> | null;

  constructor(
    private readonly provider: ChannelBindingProvider = getProviderProxySet().bindingProvider,
    options: ChannelBindingServiceOptions = {},
    deps: ChannelBindingServiceDependencies = {},
  ) {
    this.allowTransportFallback = options.allowTransportFallback ?? false;
    this.teamRunService = deps.teamRunService ?? null;
  }

  async resolveBinding(
    lookup: ChannelBindingLookup,
  ): Promise<ResolvedBinding | null> {
    const direct = await this.provider.findBinding(lookup);
    if (direct) {
      return { binding: direct, usedTransportFallback: false };
    }

    if (!this.allowTransportFallback) {
      return null;
    }

    const fallback = await this.provider.findProviderDefaultBinding({
      provider: lookup.provider,
      accountId: lookup.accountId,
      peerId: lookup.peerId,
      threadId: lookup.threadId,
    });

    if (!fallback) {
      return null;
    }

    return {
      binding: fallback,
      usedTransportFallback: true,
    };
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    const binding = await this.provider.upsertBinding(input);
    publishChannelBindingLifecycleEvent({ type: "UPSERTED", binding });
    return binding;
  }

  async listBindings(): Promise<ChannelBinding[]> {
    return this.provider.listBindings();
  }

  async upsertBindingAgentRunId(bindingId: string, agentRunId: string): Promise<ChannelBinding> {
    const binding = await this.provider.upsertBindingAgentRunId(bindingId, agentRunId);
    publishChannelBindingLifecycleEvent({ type: "UPSERTED", binding });
    return binding;
  }

  async upsertBindingTeamRunId(bindingId: string, teamRunId: string): Promise<ChannelBinding> {
    const binding = await this.provider.upsertBindingTeamRunId(bindingId, teamRunId);
    publishChannelBindingLifecycleEvent({ type: "UPSERTED", binding });
    return binding;
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    const deleted = await this.provider.deleteBinding(bindingId);
    if (deleted) {
      publishChannelBindingLifecycleEvent({ type: "DELETED", bindingId });
    }
    return deleted;
  }

  async findBindingByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelBinding | null> {
    const agentRunId = normalizeNullableString(target.agentRunId);
    const teamRunId = normalizeNullableString(target.teamRunId);
    if (!agentRunId && !teamRunId) {
      throw new Error(
        "Dispatch target lookup requires at least one of agentRunId or teamRunId.",
      );
    }

    return this.provider.findBindingByDispatchTarget({ agentRunId, teamRunId });
  }

  async isRouteBoundToTarget(
    route: ChannelSourceRoute,
    target: ChannelRunOutputTarget,
  ): Promise<boolean> {
    const normalizedRoute: ChannelSourceRoute = {
      provider: route.provider,
      transport: route.transport,
      accountId: normalizeRequiredString(route.accountId, "accountId"),
      peerId: normalizeRequiredString(route.peerId, "peerId"),
      threadId: normalizeNullableString(route.threadId),
    };
    const binding = await this.provider.findBinding(normalizedRoute);
    if (!binding) {
      return false;
    }
    return this.isBindingStillTargetingOutput(
      binding,
      normalizeOutputTarget(target),
    );
  }

  private async isBindingStillTargetingOutput(
    binding: ChannelBinding,
    target: ChannelRunOutputTarget,
  ): Promise<boolean> {
    if (target.targetType === "AGENT") {
      return binding.targetType === "AGENT" &&
        normalizeNullableString(binding.agentRunId) === target.agentRunId;
    }

    if (
      binding.targetType !== "TEAM" ||
      normalizeNullableString(binding.teamRunId) !== target.teamRunId
    ) {
      return false;
    }

    const currentTargetNodeName = normalizeNullableString(binding.targetNodeName);
    if (currentTargetNodeName && target.entryMemberName) {
      return currentTargetNodeName === target.entryMemberName;
    }

    const teamRun = await this.getTeamRunService().resolveTeamRun(target.teamRunId);
    if (!teamRun) {
      return false;
    }
    return doesTeamIdentityMatchTarget(
      resolveTeamBindingCurrentOutputIdentity(binding, teamRun),
      target,
    );
  }

  private getTeamRunService(): Pick<TeamRunService, "resolveTeamRun"> {
    if (!this.teamRunService) {
      this.teamRunService = getTeamRunService();
    }
    return this.teamRunService;
  }
}

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOutputTarget = (
  target: ChannelRunOutputTarget,
): ChannelRunOutputTarget => {
  if (target.targetType === "AGENT") {
    return {
      targetType: "AGENT",
      agentRunId: normalizeRequiredString(target.agentRunId, "target.agentRunId"),
    };
  }
  return {
    targetType: "TEAM",
    teamRunId: normalizeRequiredString(target.teamRunId, "target.teamRunId"),
    entryMemberRunId: normalizeNullableString(target.entryMemberRunId),
    entryMemberName: normalizeNullableString(target.entryMemberName),
  };
};

const doesTeamIdentityMatchTarget = (
  identity: ChannelTeamOutputTargetIdentity,
  target: Extract<ChannelRunOutputTarget, { targetType: "TEAM" }>,
): boolean => {
  if (identity.memberName && target.entryMemberName) {
    return identity.memberName === target.entryMemberName;
  }
  if (identity.memberRunId && target.entryMemberRunId) {
    return identity.memberRunId === target.entryMemberRunId;
  }
  return false;
};
