import type {
  ChannelBinding,
  ChannelDispatchTarget,
  ChannelBindingLookup,
  ChannelSourceRoute,
  ResolvedBinding,
  UpsertChannelBindingInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "../providers/channel-binding-provider.js";

export type ChannelBindingServiceOptions = {
  allowTransportFallback?: boolean;
};

export class ChannelBindingService {
  private readonly allowTransportFallback: boolean;

  constructor(
    private readonly provider: ChannelBindingProvider,
    options: ChannelBindingServiceOptions = {},
  ) {
    this.allowTransportFallback = options.allowTransportFallback ?? false;
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
    return this.provider.upsertBinding(input);
  }

  async listBindings(): Promise<ChannelBinding[]> {
    return this.provider.listBindings();
  }

  async upsertBindingAgentRunId(bindingId: string, agentRunId: string): Promise<ChannelBinding> {
    return this.provider.upsertBindingAgentRunId(bindingId, agentRunId);
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    return this.provider.deleteBinding(bindingId);
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
    target: ChannelDispatchTarget,
  ): Promise<boolean> {
    const normalizedRoute: ChannelSourceRoute = {
      provider: route.provider,
      transport: route.transport,
      accountId: normalizeRequiredString(route.accountId, "accountId"),
      peerId: normalizeRequiredString(route.peerId, "peerId"),
      threadId: normalizeNullableString(route.threadId),
    };
    const normalizedTarget: ChannelDispatchTarget = {
      agentRunId: normalizeNullableString(target.agentRunId),
      teamRunId: normalizeNullableString(target.teamRunId),
    };
    if (!normalizedTarget.agentRunId && !normalizedTarget.teamRunId) {
      throw new Error(
        "Route-target verification requires at least one of agentRunId or teamRunId.",
      );
    }
    return this.provider.isRouteBoundToTarget(normalizedRoute, normalizedTarget);
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
