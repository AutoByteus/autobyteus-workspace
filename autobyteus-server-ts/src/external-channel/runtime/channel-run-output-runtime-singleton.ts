import { ChannelRunOutputDeliveryRuntime } from "./channel-run-output-delivery-runtime.js";

let cachedRuntime: ChannelRunOutputDeliveryRuntime | null = null;

export const getChannelRunOutputDeliveryRuntime = (): ChannelRunOutputDeliveryRuntime => {
  if (!cachedRuntime) {
    cachedRuntime = new ChannelRunOutputDeliveryRuntime();
  }
  return cachedRuntime;
};

export const startChannelRunOutputDeliveryRuntime = (): void => {
  getChannelRunOutputDeliveryRuntime().start();
};

export const stopChannelRunOutputDeliveryRuntime = async (): Promise<void> => {
  if (!cachedRuntime) {
    return;
  }
  await cachedRuntime.stop();
  cachedRuntime = null;
};
