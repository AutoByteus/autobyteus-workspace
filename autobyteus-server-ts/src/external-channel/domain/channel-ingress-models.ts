import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelDispatchTarget,
  ChannelSourceRoute,
} from "./channel-binding-models.js";

export type ChannelSourceContext = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  externalMessageId: string;
  receivedAt: Date;
  turnId?: string | null;
};

export type ChannelIngressReceiptInput = ChannelSourceContext &
  ChannelDispatchTarget;

export type ChannelTurnReceiptBindingInput = ChannelSourceRoute &
  ChannelDispatchTarget & {
    externalMessageId: string;
    turnId: string;
    receivedAt: Date;
  };
