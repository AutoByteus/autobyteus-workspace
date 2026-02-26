import {
  BaseLLMResponseProcessor,
  type AgentContext,
} from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { SqlChannelBindingProvider } from "../../../external-channel/providers/sql-channel-binding-provider.js";
import { SqlChannelCallbackIdempotencyProvider } from "../../../external-channel/providers/sql-channel-callback-idempotency-provider.js";
import { SqlChannelMessageReceiptProvider } from "../../../external-channel/providers/sql-channel-message-receipt-provider.js";
import { SqlDeliveryEventProvider } from "../../../external-channel/providers/sql-delivery-event-provider.js";
import { GatewayCallbackPublisher } from "../../../external-channel/runtime/gateway-callback-publisher.js";
import { CallbackIdempotencyService } from "../../../external-channel/services/callback-idempotency-service.js";
import { ChannelBindingService } from "../../../external-channel/services/channel-binding-service.js";
import { ChannelMessageReceiptService } from "../../../external-channel/services/channel-message-receipt-service.js";
import { DeliveryEventService } from "../../../external-channel/services/delivery-event-service.js";
import { ExternalChannelReplyContentFormatter } from "../../../external-channel/services/external-channel-reply-content-formatter.js";
import { ReplyCallbackService } from "../../../external-channel/services/reply-callback-service.js";
import type { PublishAssistantReplyReason } from "../../../external-channel/services/reply-callback-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ExternalChannelAssistantReplyProcessor extends BaseLLMResponseProcessor {
  private readonly formatter = new ExternalChannelReplyContentFormatter();

  private readonly callbackService: ReplyCallbackService;

  constructor() {
    super();

    const config = appConfigProvider.config;
    const callbackBaseUrl = config.getChannelCallbackBaseUrl();
    const callbackPublisher = callbackBaseUrl
      ? new GatewayCallbackPublisher({
          baseUrl: callbackBaseUrl,
          sharedSecret: config.getChannelCallbackSharedSecret(),
          timeoutMs: config.getChannelCallbackTimeoutMs(),
        })
      : undefined;

    this.callbackService = new ReplyCallbackService(
      new ChannelMessageReceiptService(new SqlChannelMessageReceiptProvider()),
      {
        callbackIdempotencyService: new CallbackIdempotencyService(
          new SqlChannelCallbackIdempotencyProvider(),
        ),
        deliveryEventService: new DeliveryEventService(new SqlDeliveryEventProvider()),
        bindingService: new ChannelBindingService(new SqlChannelBindingProvider()),
        callbackPublisher,
      },
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
    const runId = context.agentId;
    const formatted = this.formatter.format(response);
    const turnId = normalizeOptionalString(triggeringEvent.turnId);
    const callbackIdempotencyKey = buildCallbackIdempotencyKey(runId, turnId);

    try {
      const result = await this.callbackService.publishAssistantReplyByTurn({
        agentRunId: runId,
        turnId,
        replyText: formatted.text,
        callbackIdempotencyKey,
        metadata: formatted.metadata,
      });
      if (!result.published && shouldLogSkipReason(result.reason)) {
        logger.info(`Agent run '${runId}': outbound callback skipped (${result.reason}).`);
      }
    } catch (error) {
      logger.error(
        `Agent run '${runId}': outbound callback publish failed: ${String(error)}`,
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
  agentId: string,
  turnId: string | null,
): string => {
  if (!turnId) {
    return `external-reply:${agentId}:missing-turn`;
  }
  return `external-reply:${agentId}:${turnId}`;
};

const shouldLogSkipReason = (reason: PublishAssistantReplyReason): boolean =>
  reason !== "SOURCE_NOT_FOUND" && reason !== "CALLBACK_NOT_CONFIGURED";
