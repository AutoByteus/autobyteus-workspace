import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type {
  ChannelBinding,
  ChannelDispatchTarget,
} from "../domain/models.js";

export type ChannelRuntimeDispatchResult = ChannelDispatchTarget & {
  dispatchedAt: Date;
};

export interface ChannelRuntimeFacade {
  dispatchToBinding(
    binding: ChannelBinding,
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelRuntimeDispatchResult>;
}

