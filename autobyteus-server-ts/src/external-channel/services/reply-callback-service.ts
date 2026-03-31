import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type {
  ChannelDispatchTarget,
  ChannelSourceContext,
} from "../domain/models.js";
import type { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";
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

export type PublishAssistantReplyToSourceInput = {
  source: ChannelSourceContext;
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

  constructor(
    private readonly messageReceiptService: ChannelMessageReceiptService,
    deps: ReplyCallbackServiceDependencies = {},
  ) {
    this.deliveryEventService = deps.deliveryEventService;
    this.bindingService = deps.bindingService;
    this.callbackOutboxService = deps.callbackOutboxService;
    this.callbackTargetResolver = deps.callbackTargetResolver;
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

    return this.publishAssistantReplyToSource({
      source,
      agentRunId,
      teamRunId,
      turnId,
      replyText,
      callbackIdempotencyKey,
      correlationMessageId: input.correlationMessageId,
      attachments: input.attachments,
      metadata: input.metadata,
    });
  }

  async publishAssistantReplyToSource(
    input: PublishAssistantReplyToSourceInput,
  ): Promise<PublishAssistantReplyByTurnResult> {
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

    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    const teamRunId = normalizeOptionalString(input.teamRunId ?? null);
    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );

    const target: ChannelDispatchTarget = { agentRunId, teamRunId };
    if (this.bindingService) {
      const stillBound = await this.bindingService.isRouteBoundToTarget(
        {
          provider: input.source.provider,
          transport: input.source.transport,
          accountId: input.source.accountId,
          peerId: input.source.peerId,
          threadId: input.source.threadId,
        },
        target,
      );
      if (!stillBound) {
        return skip("BINDING_NOT_FOUND");
      }
    }

    const envelope = this.buildEnvelope({
      source: input.source,
      callbackIdempotencyKey,
      replyText,
      correlationMessageId:
        normalizeOptionalString(input.correlationMessageId) ??
        input.source.externalMessageId,
      attachments: input.attachments ?? [],
      metadata: {
        turnId,
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
