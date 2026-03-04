export type RuntimeEventListener<TEvent> = (event: TEvent) => void;

type ListenerSet<TEvent> = Set<RuntimeEventListener<TEvent>>;

const getOrCreateDeferredListenerSet = <TEvent>(
  runId: string,
  deferredListenersByRunId: Map<string, ListenerSet<TEvent>>,
): ListenerSet<TEvent> => {
  const existing = deferredListenersByRunId.get(runId);
  if (existing) {
    return existing;
  }
  const created: ListenerSet<TEvent> = new Set();
  deferredListenersByRunId.set(runId, created);
  return created;
};

export const subscribeToRuntimeRunEvents = <TEvent>(options: {
  runId: string;
  listener: RuntimeEventListener<TEvent>;
  resolveActiveListenerSet: (runId: string) => ListenerSet<TEvent> | undefined;
  deferredListenersByRunId: Map<string, ListenerSet<TEvent>>;
}): (() => void) => {
  const activeListeners = options.resolveActiveListenerSet(options.runId);
  if (activeListeners) {
    activeListeners.add(options.listener);
  } else {
    getOrCreateDeferredListenerSet(options.runId, options.deferredListenersByRunId).add(
      options.listener,
    );
  }

  return () => {
    options.resolveActiveListenerSet(options.runId)?.delete(options.listener);
    const deferred = options.deferredListenersByRunId.get(options.runId);
    if (!deferred) {
      return;
    }
    deferred.delete(options.listener);
    if (deferred.size === 0) {
      options.deferredListenersByRunId.delete(options.runId);
    }
  };
};

export const rebindDeferredRuntimeListeners = <TEvent>(options: {
  runId: string;
  activeListeners: ListenerSet<TEvent>;
  deferredListenersByRunId: Map<string, ListenerSet<TEvent>>;
}): void => {
  const deferred = options.deferredListenersByRunId.get(options.runId);
  if (!deferred) {
    return;
  }
  for (const listener of deferred) {
    options.activeListeners.add(listener);
  }
};

export const moveRuntimeListenersToDeferred = <TEvent>(options: {
  runId: string;
  activeListeners: ListenerSet<TEvent>;
  deferredListenersByRunId: Map<string, ListenerSet<TEvent>>;
}): void => {
  if (options.activeListeners.size === 0) {
    return;
  }
  const deferred = getOrCreateDeferredListenerSet(
    options.runId,
    options.deferredListenersByRunId,
  );
  for (const listener of options.activeListeners) {
    deferred.add(listener);
  }
};

export const emitRuntimeEvent = <TEvent>(options: {
  listeners: ListenerSet<TEvent>;
  event: TEvent;
  onListenerError?: (error: unknown) => void;
}): void => {
  for (const listener of options.listeners) {
    try {
      listener(options.event);
    } catch (error) {
      options.onListenerError?.(error);
    }
  }
};

