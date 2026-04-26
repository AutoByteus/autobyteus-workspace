import type {
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputDeliveryStatus,
  ChannelRunOutputObservedTurnInput,
  ChannelRunOutputPublishedInput,
  ChannelRunOutputPublishPendingInput,
  ChannelRunOutputReplyFinalizedInput,
  ChannelRunOutputTerminalInput,
} from "../domain/models.js";

export interface ChannelRunOutputDeliveryProvider {
  getByDeliveryKey(deliveryKey: string): Promise<ChannelRunOutputDeliveryRecord | null>;
  upsertObservedTurn(
    input: ChannelRunOutputObservedTurnInput,
  ): Promise<ChannelRunOutputDeliveryRecord>;
  markReplyFinalized(
    input: ChannelRunOutputReplyFinalizedInput,
  ): Promise<ChannelRunOutputDeliveryRecord>;
  markPublishPending(
    input: ChannelRunOutputPublishPendingInput,
  ): Promise<ChannelRunOutputDeliveryRecord>;
  markPublished(
    input: ChannelRunOutputPublishedInput,
  ): Promise<ChannelRunOutputDeliveryRecord>;
  markTerminal(
    input: ChannelRunOutputTerminalInput,
  ): Promise<ChannelRunOutputDeliveryRecord>;
  listByStatuses(
    statuses: ChannelRunOutputDeliveryStatus[],
  ): Promise<ChannelRunOutputDeliveryRecord[]>;
  listByBindingId(bindingId: string): Promise<ChannelRunOutputDeliveryRecord[]>;
}
