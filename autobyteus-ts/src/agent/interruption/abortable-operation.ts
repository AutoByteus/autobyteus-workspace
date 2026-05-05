import {
  AgentInterruptionError,
  isAbortLikeError,
  isAgentInterruptionError
} from './agent-interruption.js';

export type TurnOperationMeta = {
  operationId?: string | null;
  kind: string;
  turnId: string;
};

export type AbortableOperationState = {
  signal: AbortSignal;
  getReason: () => string;
};

export const throwIfAborted = (state: AbortableOperationState, meta: TurnOperationMeta): void => {
  if (state.signal.aborted) {
    throw new AgentInterruptionError({
      turnId: meta.turnId,
      reason: state.getReason(),
      operationId: meta.operationId ?? null,
      operationKind: meta.kind
    });
  }
};

const makeInterruptionError = (
  state: AbortableOperationState,
  meta: TurnOperationMeta
): AgentInterruptionError =>
  new AgentInterruptionError({
    turnId: meta.turnId,
    reason: state.getReason(),
    operationId: meta.operationId ?? null,
    operationKind: meta.kind
  });

export async function racePromiseWithAbort<T>(
  promise: Promise<T>,
  state: AbortableOperationState,
  meta: TurnOperationMeta
): Promise<T> {
  throwIfAborted(state, meta);

  let abortListener: (() => void) | null = null;
  const abortPromise = new Promise<never>((_, reject) => {
    abortListener = () => reject(makeInterruptionError(state, meta));
    state.signal.addEventListener('abort', abortListener, { once: true });
  });

  promise.catch((error) => {
    if (!state.signal.aborted) {
      return;
    }
    console.debug(
      `Late rejection after interrupted operation '${meta.kind}' for turn '${meta.turnId}': ${String(error)}`
    );
  });

  try {
    return await Promise.race([promise, abortPromise]);
  } catch (error) {
    if (isAgentInterruptionError(error)) {
      throw error;
    }
    if (state.signal.aborted && isAbortLikeError(error)) {
      throw makeInterruptionError(state, meta);
    }
    throw error;
  } finally {
    if (abortListener) {
      state.signal.removeEventListener('abort', abortListener);
    }
  }
}

export async function* iterateWithAbort<T>(
  iterable: AsyncIterable<T>,
  state: AbortableOperationState,
  meta: TurnOperationMeta
): AsyncGenerator<T, void, unknown> {
  const iterator = iterable[Symbol.asyncIterator]();
  try {
    while (true) {
      const next = await racePromiseWithAbort(iterator.next(), state, meta);
      if (next.done) {
        return;
      }
      yield next.value;
    }
  } finally {
    if (state.signal.aborted && typeof iterator.return === 'function') {
      Promise.resolve(iterator.return()).catch((error) => {
        console.debug(
          `Ignoring iterator return error after interrupted operation '${meta.kind}' for turn '${meta.turnId}': ${String(error)}`
        );
      });
    }
  }
}
