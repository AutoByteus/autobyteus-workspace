import type {
  ChannelDeliveryEvent,
  UpsertChannelDeliveryEventInput,
} from "../domain/models.js";

export interface DeliveryEventProvider {
  upsertByCallbackKey(
    input: UpsertChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent>;
  findByCallbackKey(callbackIdempotencyKey: string): Promise<ChannelDeliveryEvent | null>;
}

