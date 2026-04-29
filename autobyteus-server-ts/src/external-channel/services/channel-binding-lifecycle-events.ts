import type { ChannelBinding } from "../domain/models.js";

export type ChannelBindingLifecycleEvent =
  | {
      type: "UPSERTED";
      binding: ChannelBinding;
    }
  | {
      type: "DELETED";
      bindingId: string;
    };

export type ChannelBindingLifecycleListener = (
  event: ChannelBindingLifecycleEvent,
) => void;

const listeners = new Set<ChannelBindingLifecycleListener>();

export const subscribeToChannelBindingLifecycleEvents = (
  listener: ChannelBindingLifecycleListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const publishChannelBindingLifecycleEvent = (
  event: ChannelBindingLifecycleEvent,
): void => {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.warn("Channel binding lifecycle listener failed.", error);
    }
  }
};

export const resetChannelBindingLifecycleEventsForTests = (): void => {
  listeners.clear();
};
