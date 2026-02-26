import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";

export type ChannelDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED";

export type ChannelDeliveryEvent = {
  id: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string;
  status: ChannelDeliveryStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertChannelDeliveryEventInput = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId?: string | null;
  callbackIdempotencyKey: string;
  status: ChannelDeliveryStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};
