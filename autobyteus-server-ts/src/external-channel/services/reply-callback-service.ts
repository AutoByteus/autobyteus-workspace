import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type {
  ChannelOutputRoute,
  ChannelRunOutputTarget,
} from "../domain/models.js";
import type { DeliveryEventService } from "./delivery-event-service.js";
import type { ChannelBindingService } from "./channel-binding-service.js";

export type PublishRunOutputReplyInput = {
  route: ChannelOutputRoute;
  target: ChannelRunOutputTarget;
  turnId: string;
  replyText: string | null;
  callbackIdempotencyKey: string;
  correlationMessageId: string | null;
  attachments?: ExternalAttachment[];
  metadata?: Record<string, unknown>;
};

export type PublishRunOutputReplyReason =
  | "DUPLICATE"
  | "TURN_ID_MISSING"
  | "BINDING_NOT_FOUND"
  | "EMPTY_REPLY"
  | "CALLBACK_NOT_CONFIGURED";

export type PublishRunOutputReplyResult =
  | {
      published: true;
      duplicate: false;
      reason: null;
      envelope: ExternalOutboundEnvelope;
    }
  | {
      published: false;
      duplicate: boolean;
      reason: PublishRunOutputReplyReason;
      envelope: null;
    };

type CallbackOutboxPort = {
  enqueueOrGet(
    callbackIdempotencyKey: string,
    payload: ExternalOutboundEnvelope,
  ): Promise<{
    duplicate: boolean;
  }>;
};

type CallbackTargetResolverPort = {
  resolveGatewayCallbackDispatchTarget: () => Promise<{
    state: "AVAILABLE" | "UNAVAILABLE" | "DISABLED";
    reason: string | null;
  }>;
};

export type ReplyCallbackServiceDependencies = {
  deliveryEventService?: DeliveryEventService;
  bindingService?: ChannelBindingService;
  callbackOutboxService?: CallbackOutboxPort;
  callbackTargetResolver?: CallbackTargetResolverPort;
};

export class ReplyCallbackService {
  private readonly deliveryEventService?: DeliveryEventService;
  private readonly bindingService?: ChannelBindingService;
  private readonly callbackOutboxService?: CallbackOutboxPort;
  private readonly callbackTargetResolver?: CallbackTargetResolverPort;

  constructor(deps: ReplyCallbackServiceDependencies = {}) {
    this.deliveryEventService = deps.deliveryEventService;
    this.bindingService = deps.bindingService;
    this.callbackOutboxService = deps.callbackOutboxService;
    this.callbackTargetResolver = deps.callbackTargetResolver;
  }

  async publishRunOutputReply(
    input: PublishRunOutputReplyInput,
  ): Promise<PublishRunOutputReplyResult> {
    const turnId = normalizeOptionalString(input.turnId);
    if (!turnId) {
      return skip("TURN_ID_MISSING");
    }

    const replyText = normalizeOptionalString(input.replyText);
    if (!replyText) {
      return skip("EMPTY_REPLY");
    }

    const deliveryEventService = this.deliveryEventService;
    const callbackOutboxService = this.callbackOutboxService;
    const callbackTargetResolver = this.callbackTargetResolver;
    if (
      !deliveryEventService ||
      !callbackOutboxService ||
      !callbackTargetResolver
    ) {
      return skip("CALLBACK_NOT_CONFIGURED");
    }

    const callbackTarget =
      await callbackTargetResolver.resolveGatewayCallbackDispatchTarget();
    if (callbackTarget.state === "DISABLED") {
      return skip("CALLBACK_NOT_CONFIGURED");
    }

    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );
    const route = normalizeRoute(input.route);
    const target = normalizeTarget(input.target);

    if (this.bindingService) {
      const stillBound = await this.bindingService.isRouteBoundToTarget(
        route,
        target,
      );
      if (!stillBound) {
        return skip("BINDING_NOT_FOUND");
      }
    }

    const envelope = this.buildEnvelope({
      route,
      callbackIdempotencyKey,
      replyText,
      correlationMessageId:
        normalizeOptionalString(input.correlationMessageId) ?? callbackIdempotencyKey,
      attachments: input.attachments ?? [],
      metadata: {
        turnId,
        ...targetMetadata(target),
        ...normalizeMetadata(input.metadata),
      },
    });

    const enqueueResult = await callbackOutboxService.enqueueOrGet(
      callbackIdempotencyKey,
      envelope,
    );
    if (enqueueResult.duplicate) {
      return {
        published: false,
        duplicate: true,
        reason: "DUPLICATE",
        envelope: null,
      };
    }

    const deliveryBaseInput = {
      provider: envelope.provider,
      transport: envelope.transport,
      accountId: envelope.accountId,
      peerId: envelope.peerId,
      threadId: envelope.threadId,
      correlationMessageId: envelope.correlationMessageId,
      callbackIdempotencyKey: envelope.callbackIdempotencyKey,
      metadata: envelope.metadata,
    };
    try {
      await deliveryEventService.recordPending(deliveryBaseInput);
    } catch (error) {
      console.warn(
        "Failed to record pending external-channel delivery event after outbox enqueue.",
        error,
      );
    }

    return {
      published: true,
      duplicate: false,
      reason: null,
      envelope,
    };
  }

  private buildEnvelope(input: {
    route: ChannelOutputRoute;
    callbackIdempotencyKey: string;
    correlationMessageId: string;
    replyText: string;
    attachments: ExternalAttachment[];
    metadata: Record<string, unknown>;
  }): ExternalOutboundEnvelope {
    return {
      provider: input.route.provider,
      transport: input.route.transport,
      accountId: input.route.accountId,
      peerId: input.route.peerId,
      threadId: input.route.threadId,
      correlationMessageId: input.correlationMessageId,
      callbackIdempotencyKey: input.callbackIdempotencyKey,
      replyText: input.replyText,
      attachments: input.attachments,
      chunks: [],
      metadata: input.metadata,
    };
  }
}

const skip = (reason: PublishRunOutputReplyReason): PublishRunOutputReplyResult => ({
  published: false,
  duplicate: false,
  reason,
  envelope: null,
});

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
    entryMemberRunId: normalizeOptionalString(target.entryMemberRunId),
    entryMemberName: normalizeOptionalString(target.entryMemberName),
  };
};

const normalizeRoute = (route: ChannelOutputRoute): ChannelOutputRoute => ({
  provider: route.provider,
  transport: route.transport,
  accountId: normalizeRequiredString(route.accountId, "route.accountId"),
  peerId: normalizeRequiredString(route.peerId, "route.peerId"),
  threadId: normalizeOptionalString(route.threadId),
});

const targetMetadata = (target: ChannelRunOutputTarget): Record<string, unknown> => {
  if (target.targetType === "AGENT") {
    return {
      targetType: target.targetType,
      agentRunId: target.agentRunId,
    };
  }
  return {
    targetType: target.targetType,
    teamRunId: target.teamRunId,
    memberRunId: target.entryMemberRunId,
    memberName: target.entryMemberName,
  };
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeMetadata = (
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (metadata === undefined) {
    return {};
  }
  return metadata;
};
