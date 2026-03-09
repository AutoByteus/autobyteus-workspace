import {
  BaseLLMResponseProcessor,
  type AgentContext,
} from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { getProviderProxySet } from "../../../external-channel/providers/provider-proxy-set.js";
import { GatewayCallbackPublisher } from "../../../external-channel/runtime/gateway-callback-publisher.js";
import { resolveGatewayCallbackPublisherOptions } from "../../../external-channel/runtime/gateway-callback-publisher-options-resolver.js";
import { CallbackIdempotencyService } from "../../../external-channel/services/callback-idempotency-service.js";
import { ChannelBindingService } from "../../../external-channel/services/channel-binding-service.js";
import { ChannelMessageReceiptService } from "../../../external-channel/services/channel-message-receipt-service.js";
import { DeliveryEventService } from "../../../external-channel/services/delivery-event-service.js";
import { ExternalChannelReplyContentFormatter } from "../../../external-channel/services/external-channel-reply-content-formatter.js";
import { ReplyCallbackService } from "../../../external-channel/services/reply-callback-service.js";
import type { PublishAssistantReplyReason } from "../../../external-channel/services/reply-callback-service.js";
import { resolveAgentRunIdFromRuntimeContext } from "../../utils/core-boundary-id-normalizer.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ExternalChannelAssistantReplyProcessor extends BaseLLMResponseProcessor {
  private readonly formatter = new ExternalChannelReplyContentFormatter();

  private readonly channelMessageReceiptService: ChannelMessageReceiptService;

  private readonly callbackIdempotencyService: CallbackIdempotencyService;

  private readonly deliveryEventService: DeliveryEventService;

  private readonly bindingService: ChannelBindingService;

  constructor() {
    super();

    const providerSet = getProviderProxySet();

    this.channelMessageReceiptService = new ChannelMessageReceiptService(
      providerSet.messageReceiptProvider,
    );
    this.callbackIdempotencyService = new CallbackIdempotencyService(
      providerSet.callbackIdempotencyProvider,
    );
    this.deliveryEventService = new DeliveryEventService(
      providerSet.deliveryEventProvider,
    );
    this.bindingService = new ChannelBindingService(providerSet.bindingProvider);
  }

  private createCallbackService(): ReplyCallbackService {
    const callbackPublisherOptions = resolveGatewayCallbackPublisherOptions();
    const callbackPublisher = callbackPublisherOptions
      ? new GatewayCallbackPublisher(callbackPublisherOptions)
      : undefined;

    return new ReplyCallbackService(this.channelMessageReceiptService, {
      callbackIdempotencyService: this.callbackIdempotencyService,
      deliveryEventService: this.deliveryEventService,
      bindingService: this.bindingService,
      callbackPublisher,
    });
  }

  private logSkippedPublish(
    agentRunId: string,
    reason: PublishAssistantReplyReason,
  ): void {
    logger.info(
      `Agent '${agentRunId}': outbound callback skipped (${reason}).`,
    );
  }

  static override getName(): string {
    return "ExternalChannelAssistantReplyProcessor";
  }

  static override getOrder(): number {
    return 980;
  }

  static override isMandatory(): boolean {
    return true;
  }

  async processResponse(
    response: CompleteResponse,
    context: AgentContext,
    triggeringEvent: LLMCompleteResponseReceivedEvent,
  ): Promise<boolean> {
    const agentRunId = resolveAgentRunIdFromRuntimeContext(context);
    const formatted = this.formatter.format(response);
    const turnId = normalizeOptionalString(triggeringEvent.turnId);
    const callbackIdempotencyKey = buildCallbackIdempotencyKey(agentRunId, turnId);

    try {
      const callbackService = this.createCallbackService();
      const result = await callbackService.publishAssistantReplyByTurn({
        agentRunId,
        turnId,
        replyText: formatted.text,
        callbackIdempotencyKey,
        metadata: formatted.metadata,
      });
      if (!result.published && shouldLogSkipReason(result.reason)) {
        this.logSkippedPublish(agentRunId, result.reason);
      }
    } catch (error) {
      logger.error(
        `Agent '${agentRunId}': outbound callback publish failed: ${String(error)}`,
      );
    }

    return false;
  }
}

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildCallbackIdempotencyKey = (
  agentRunId: string,
  turnId: string | null,
): string => {
  if (!turnId) {
    return `external-reply:${agentRunId}:missing-turn`;
  }
  return `external-reply:${agentRunId}:${turnId}`;
};

const shouldLogSkipReason = (reason: PublishAssistantReplyReason): boolean =>
  reason !== "SOURCE_NOT_FOUND";
