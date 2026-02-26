import type {
  ChannelDeliveryEvent,
  ChannelDeliveryStatus,
  UpsertChannelDeliveryEventInput,
} from "../domain/models.js";
import type { DeliveryEventProvider } from "../providers/delivery-event-provider.js";

export type RecordChannelDeliveryEventInput = Omit<
  UpsertChannelDeliveryEventInput,
  "status"
>;

export class DeliveryEventService {
  constructor(private readonly provider: DeliveryEventProvider) {}

  async recordPending(
    input: RecordChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    return this.recordWithStatus(input, "PENDING");
  }

  async recordSent(
    input: RecordChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    return this.recordWithStatus(input, "SENT");
  }

  async recordDelivered(
    input: RecordChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    return this.recordWithStatus(input, "DELIVERED");
  }

  async recordFailed(
    input: RecordChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    return this.recordWithStatus(input, "FAILED");
  }

  private async recordWithStatus(
    input: RecordChannelDeliveryEventInput,
    status: ChannelDeliveryStatus,
  ): Promise<ChannelDeliveryEvent> {
    const normalized = normalizeInput(input);
    const errorMessage = status === "FAILED" ? normalized.errorMessage : null;

    return this.provider.upsertByCallbackKey({
      ...normalized,
      status,
      errorMessage,
    });
  }
}

const normalizeInput = (
  input: RecordChannelDeliveryEventInput,
): RecordChannelDeliveryEventInput => ({
  ...input,
  accountId: normalizeRequiredString(input.accountId, "accountId"),
  peerId: normalizeRequiredString(input.peerId, "peerId"),
  threadId: normalizeNullableString(input.threadId),
  correlationMessageId: normalizeNullableString(input.correlationMessageId),
  callbackIdempotencyKey: normalizeRequiredString(
    input.callbackIdempotencyKey,
    "callbackIdempotencyKey",
  ),
  errorMessage: normalizeNullableString(input.errorMessage),
  metadata: input.metadata ?? {},
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
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
