import {
  BaseLLMResponseProcessor,
  type AgentContext,
} from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { buildDefaultReplyCallbackService } from "../../../external-channel/runtime/gateway-callback-delivery-runtime.js";
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

  private createCallbackService(): ReplyCallbackService {
    return buildDefaultReplyCallbackService();
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
