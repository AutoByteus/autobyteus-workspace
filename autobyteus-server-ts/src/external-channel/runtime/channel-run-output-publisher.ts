import type { ChannelRunOutputDeliveryRecord } from "../domain/models.js";
import { ChannelRunOutputDeliveryService } from "../services/channel-run-output-delivery-service.js";
import { ReplyCallbackService } from "../services/reply-callback-service.js";

export type ChannelRunOutputPublishResult =
  | "PUBLISHED"
  | "UNBOUND"
  | "FAILED"
  | "SKIPPED";

export class ChannelRunOutputPublisher {
  constructor(
    private readonly deliveryService: ChannelRunOutputDeliveryService,
    private readonly replyCallbackServiceFactory: () => ReplyCallbackService,
  ) {}

  async publishRecord(
    record: ChannelRunOutputDeliveryRecord,
  ): Promise<ChannelRunOutputPublishResult> {
    if (record.status === "PUBLISHED") {
      return "PUBLISHED";
    }

    const replyText = normalizeOptionalString(record.replyTextFinal);
    if (!replyText) {
      return "SKIPPED";
    }

    const callbackIdempotencyKey = record.callbackIdempotencyKey ??
      this.deliveryService.buildCallbackIdempotencyKey(record);
    const pending = await this.deliveryService.markPublishPending({
      deliveryKey: record.deliveryKey,
      callbackIdempotencyKey,
    });
    const result = await this.replyCallbackServiceFactory().publishRunOutputReply({
      route: pending.route,
      target: pending.target,
      turnId: pending.turnId,
      replyText,
      callbackIdempotencyKey,
      correlationMessageId: pending.correlationMessageId,
      metadata: { deliveryKey: pending.deliveryKey },
    });

    if (result.published || result.duplicate) {
      await this.deliveryService.markPublished({ deliveryKey: pending.deliveryKey });
      return "PUBLISHED";
    }

    if (result.reason === "BINDING_NOT_FOUND") {
      await this.deliveryService.markUnbound({
        deliveryKey: pending.deliveryKey,
        reason: result.reason,
      });
      return "UNBOUND";
    }

    await this.deliveryService.markFailed({
      deliveryKey: pending.deliveryKey,
      error: result.reason,
    });
    return "FAILED";
  }
}

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
