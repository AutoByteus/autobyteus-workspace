import type {
  ChannelOutputRoute,
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputDeliveryStatus,
  ChannelRunOutputObservedTurnInput,
  ChannelRunOutputTarget,
} from "../domain/models.js";
import type { ChannelRunOutputDeliveryProvider } from "../providers/channel-run-output-delivery-provider.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";

export type BuildChannelRunOutputDeliveryKeyInput = {
  bindingId: string;
  route: ChannelOutputRoute;
  target: ChannelRunOutputTarget;
  turnId: string;
};

export type UpsertObservedChannelRunOutputTurnInput =
  BuildChannelRunOutputDeliveryKeyInput & {
    correlationMessageId: string | null;
    observedAt?: Date;
  };

const PUBLISHABLE_STATUSES: ChannelRunOutputDeliveryStatus[] = [
  "REPLY_FINALIZED",
  "PUBLISH_PENDING",
];

const RESTORABLE_STATUSES: ChannelRunOutputDeliveryStatus[] = [
  "OBSERVING",
  "REPLY_FINALIZED",
  "PUBLISH_PENDING",
];

export class ChannelRunOutputDeliveryService {
  constructor(
    private readonly provider: ChannelRunOutputDeliveryProvider = getProviderProxySet().runOutputDeliveryProvider,
  ) {}

  async getByDeliveryKey(
    deliveryKey: string,
  ): Promise<ChannelRunOutputDeliveryRecord | null> {
    return this.provider.getByDeliveryKey(normalizeRequiredString(deliveryKey, "deliveryKey"));
  }

  buildDeliveryKey(input: BuildChannelRunOutputDeliveryKeyInput): string {
    const target = normalizeTarget(input.target);
    const normalized = {
      bindingId: normalizeRequiredString(input.bindingId, "bindingId"),
      route: normalizeRoute(input.route),
      target: normalizeDeliveryKeyTarget(target),
      turnId: normalizeRequiredString(input.turnId, "turnId"),
    };
    return `external-output:${Buffer.from(JSON.stringify(normalized)).toString("base64url")}`;
  }

  buildCallbackIdempotencyKey(input: BuildChannelRunOutputDeliveryKeyInput): string {
    return this.buildDeliveryKey(input);
  }

  async upsertObservedTurn(
    input: UpsertObservedChannelRunOutputTurnInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    const normalized: ChannelRunOutputObservedTurnInput = {
      bindingId: normalizeRequiredString(input.bindingId, "bindingId"),
      route: normalizeRoute(input.route),
      target: normalizeTarget(input.target),
      turnId: normalizeRequiredString(input.turnId, "turnId"),
      correlationMessageId: normalizeNullableString(input.correlationMessageId),
      observedAt: normalizeDate(input.observedAt ?? new Date(), "observedAt"),
      deliveryKey: this.buildDeliveryKey(input),
    };
    return this.provider.upsertObservedTurn(normalized);
  }

  async markReplyFinalized(input: {
    deliveryKey: string;
    replyTextFinal: string;
    finalizedAt?: Date;
  }): Promise<ChannelRunOutputDeliveryRecord> {
    return this.provider.markReplyFinalized({
      deliveryKey: normalizeRequiredString(input.deliveryKey, "deliveryKey"),
      replyTextFinal: normalizeRequiredString(input.replyTextFinal, "replyTextFinal"),
      finalizedAt: normalizeDate(input.finalizedAt ?? new Date(), "finalizedAt"),
    });
  }

  async markPublishPending(input: {
    deliveryKey: string;
    callbackIdempotencyKey: string;
    publishRequestedAt?: Date;
  }): Promise<ChannelRunOutputDeliveryRecord> {
    return this.provider.markPublishPending({
      deliveryKey: normalizeRequiredString(input.deliveryKey, "deliveryKey"),
      callbackIdempotencyKey: normalizeRequiredString(
        input.callbackIdempotencyKey,
        "callbackIdempotencyKey",
      ),
      publishRequestedAt: normalizeDate(
        input.publishRequestedAt ?? new Date(),
        "publishRequestedAt",
      ),
    });
  }

  async markPublished(input: {
    deliveryKey: string;
    publishedAt?: Date;
  }): Promise<ChannelRunOutputDeliveryRecord> {
    return this.provider.markPublished({
      deliveryKey: normalizeRequiredString(input.deliveryKey, "deliveryKey"),
      publishedAt: normalizeDate(input.publishedAt ?? new Date(), "publishedAt"),
    });
  }

  async markUnbound(input: {
    deliveryKey: string;
    reason?: string | null;
    updatedAt?: Date;
  }): Promise<ChannelRunOutputDeliveryRecord> {
    return this.provider.markTerminal({
      deliveryKey: normalizeRequiredString(input.deliveryKey, "deliveryKey"),
      status: "UNBOUND",
      lastError: normalizeNullableString(input.reason ?? null),
      updatedAt: normalizeDate(input.updatedAt ?? new Date(), "updatedAt"),
    });
  }

  async markFailed(input: {
    deliveryKey: string;
    error: string;
    updatedAt?: Date;
  }): Promise<ChannelRunOutputDeliveryRecord> {
    return this.provider.markTerminal({
      deliveryKey: normalizeRequiredString(input.deliveryKey, "deliveryKey"),
      status: "FAILED",
      lastError: normalizeRequiredString(input.error, "error"),
      updatedAt: normalizeDate(input.updatedAt ?? new Date(), "updatedAt"),
    });
  }

  async listPublishableRecords(): Promise<ChannelRunOutputDeliveryRecord[]> {
    return this.provider.listByStatuses(PUBLISHABLE_STATUSES);
  }

  async listRestorableRecords(): Promise<ChannelRunOutputDeliveryRecord[]> {
    return this.provider.listByStatuses(RESTORABLE_STATUSES);
  }

  async listByBindingId(bindingId: string): Promise<ChannelRunOutputDeliveryRecord[]> {
    return this.provider.listByBindingId(normalizeRequiredString(bindingId, "bindingId"));
  }
}

const normalizeTarget = (target: ChannelRunOutputTarget): ChannelRunOutputTarget => {
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

const normalizeDeliveryKeyTarget = (
  target: ChannelRunOutputTarget,
): Record<string, string> => {
  if (target.targetType === "AGENT") {
    return {
      targetType: "AGENT",
      agentRunId: target.agentRunId,
    };
  }
  const memberIdentity = target.entryMemberName ?? target.entryMemberRunId;
  if (!memberIdentity) {
    throw new Error(
      "Team output delivery keys require entryMemberName or entryMemberRunId.",
    );
  }
  return {
    targetType: "TEAM",
    teamRunId: target.teamRunId,
    entryMemberIdentity: memberIdentity,
  };
};

const normalizeRoute = (route: ChannelOutputRoute): ChannelOutputRoute => ({
  provider: route.provider,
  transport: route.transport,
  accountId: normalizeRequiredString(route.accountId, "route.accountId"),
  peerId: normalizeRequiredString(route.peerId, "route.peerId"),
  threadId: normalizeNullableString(route.threadId),
});

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (
  value: string | null | undefined,
): string | null => {
  if (value == null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDate = (value: Date, field: string): Date => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${field} must be a valid Date.`);
  }
  return value;
};
