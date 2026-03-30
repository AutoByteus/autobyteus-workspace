export const dispatchRuntimeEvent = <T>(input: {
  listeners: Set<(event: T) => void>;
  event: T;
  onListenerError?: (error: unknown) => void;
}): void => {
  for (const listener of input.listeners) {
    try {
      listener(input.event);
    } catch (error) {
      input.onListenerError?.(error);
    }
  }
};
