import type { ChannelDispatchTarget } from "../domain/models.js";

export type ChannelRunDispatchResult = ChannelDispatchTarget & {
  dispatchedAt: Date;
};
