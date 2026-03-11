import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ChannelDispatchTarget } from "../domain/models.js";
import type { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";
import type { CallbackIdempotencyService } from "./callback-idempotency-service.js";
import type { DeliveryEventService } from "./delivery-event-service.js";
import type { ChannelBindingService } from "./channel-binding-service.js";

export type PublishAssistantReplyByTurnInput = {
  agentRunId: string;
  turnId: string | null;
  replyText: string | null;
  callbackIdempotencyKey: string;
  teamRunId?: string | null;
  correlationMessageId?: string | null;
  attachments?: ExternalAttachment[];
  metadata?: Record<string, unknown>;
};

export type PublishAssistantReplyReason =
  | "DUPLICATE"
  | "TURN_ID_MISSING"
  | "SOURCE_NOT_FOUND"
  | "BINDING_NOT_FOUND"
  | "EMPTY_REPLY"
  | "CALLBACK_NOT_CONFIGURED";

export type PublishAssistantReplyByTurnResult =
  | {
      published: true;
      duplicate: false;
      reason: null;
      envelope: ExternalOutboundEnvelope;
    }
  | {
      published: false;
      duplicate: boolean;
      reason: PublishAssistantReplyReason;
      envelope: null;
    };

type ChannelSourceLookupPort = Pick<ChannelMessageReceiptService, "getSourceByAgentRunTurn">;

type CallbackIdempotencyPort = Pick<CallbackIdempotencyService, "reserveCallbackKey">;

type DeliveryEventPort = Pick<DeliveryEventService, "recordPending">;

type ChannelBindingLookupPort = Pick<ChannelBindingService, "isRouteBoundToTarget">;

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
  callbackIdempotencyService?: CallbackIdempotencyPort;
  deliveryEventService?: DeliveryEventPort;
  bindingService?: ChannelBindingLookupPort;
  callbackOutboxService?: CallbackOutboxPort;
  callbackTargetResolver?: CallbackTargetResolverPort;
};

export type ReplyCallbackServiceOptions = {
  callbackIdempotencyTtlSeconds?: number;
};

export class ReplyCallbackService {
  private readonly callbackIdempotencyService?: CallbackIdempotencyPort;

  private readonly deliveryEventService?: DeliveryEventPort;

  private readonly bindingService?: ChannelBindingLookupPort;

  private readonly callbackOutboxService?: CallbackOutboxPort;

  private readonly callbackTargetResolver?: CallbackTargetResolverPort;

  private readonly callbackIdempotencyTtlSeconds: number;

  constructor(
    private readonly messageReceiptService: ChannelSourceLookupPort,
    deps: ReplyCallbackServiceDependencies = {},
    options: ReplyCallbackServiceOptions = {},
  ) {
    this.callbackIdempotencyService = deps.callbackIdempotencyService;
    this.deliveryEventService = deps.deliveryEventService;
    this.bindingService = deps.bindingService;
    this.callbackOutboxService = deps.callbackOutboxService;
    this.callbackTargetResolver = deps.callbackTargetResolver;
    this.callbackIdempotencyTtlSeconds = options.callbackIdempotencyTtlSeconds ?? 3600;
  }

  async publishAssistantReplyByTurn(
    input: PublishAssistantReplyByTurnInput,
  ): Promise<PublishAssistantReplyByTurnResult> {
    const turnId = normalizeOptionalString(input.turnId);
    if (!turnId) {
      return skip("TURN_ID_MISSING");
    }

    const replyText = normalizeOptionalString(input.replyText);
    if (!replyText) {
      return skip("EMPTY_REPLY");
    }

    const callbackIdempotencyService = this.callbackIdempotencyService;
    const deliveryEventService = this.deliveryEventService;
    const callbackOutboxService = this.callbackOutboxService;
    const callbackTargetResolver = this.callbackTargetResolver;
    if (
      !callbackIdempotencyService ||
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

    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeOptionalString(input.teamRunId ?? null);
    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );

    const source = await this.messageReceiptService.getSourceByAgentRunTurn(agentRunId, turnId);
    if (!source) {
      return skip("SOURCE_NOT_FOUND");
    }

    const target: ChannelDispatchTarget = { agentRunId, teamRunId };
    if (this.bindingService) {
      const stillBound = await this.bindingService.isRouteBoundToTarget(
        {
          provider: source.provider,
          transport: source.transport,
          accountId: source.accountId,
          peerId: source.peerId,
          threadId: source.threadId,
        },
        target,
      );
      if (!stillBound) {
        return skip("BINDING_NOT_FOUND");
      }
    }

    const idempotency = await callbackIdempotencyService.reserveCallbackKey(
      callbackIdempotencyKey,
      this.callbackIdempotencyTtlSeconds,
    );
    if (idempotency.duplicate) {
      return {
        published: false,
        duplicate: true,
        reason: "DUPLICATE",
        envelope: null,
      };
    }

    const envelope = this.buildEnvelope({
      source,
      callbackIdempotencyKey,
      replyText,
      correlationMessageId:
        normalizeOptionalString(input.correlationMessageId) ?? source.externalMessageId,
      attachments: input.attachments ?? [],
      metadata: {
        turnId,
        ...normalizeMetadata(input.metadata),
      },
    });

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
    await deliveryEventService.recordPending(deliveryBaseInput);

    await callbackOutboxService.enqueueOrGet(callbackIdempotencyKey, envelope);

    return {
      published: true,
      duplicate: false,
      reason: null,
      envelope,
    };
  }

  private buildEnvelope(input: {
    source: {
      provider: ExternalOutboundEnvelope["provider"];
      transport: ExternalOutboundEnvelope["transport"];
      accountId: string;
      peerId: string;
      threadId: string | null;
      externalMessageId: string;
    };
    callbackIdempotencyKey: string;
    correlationMessageId: string;
    replyText: string;
    attachments: ExternalAttachment[];
    metadata: Record<string, unknown>;
  }): ExternalOutboundEnvelope {
    return {
      provider: input.source.provider,
      transport: input.source.transport,
      accountId: input.source.accountId,
      peerId: input.source.peerId,
      threadId: input.source.threadId,
      correlationMessageId: input.correlationMessageId,
      callbackIdempotencyKey: input.callbackIdempotencyKey,
      replyText: input.replyText,
      attachments: input.attachments,
      chunks: [],
      metadata: input.metadata,
    };
  }
}

const skip = (reason: PublishAssistantReplyReason): PublishAssistantReplyByTurnResult => ({
  published: false,
  duplicate: false,
  reason,
  envelope: null,
});

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
