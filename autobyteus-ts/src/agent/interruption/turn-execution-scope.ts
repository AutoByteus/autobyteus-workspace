import {
  AgentInterruptResult,
  normalizeInterruptReason
} from './agent-interruption.js';
import {
  iterateWithAbort,
  racePromiseWithAbort,
  throwIfAborted,
  type TurnOperationMeta
} from './abortable-operation.js';

type AbortCallback = () => void | Promise<void>;

export class TurnExecutionScope {
  readonly turnId: string;
  private readonly controller = new AbortController();
  private readonly abortCallbacks = new Set<AbortCallback>();
  private interruptReason: string | null = null;
  private interruptRequested = false;
  private settled = false;

  constructor(turnId: string) {
    this.turnId = turnId;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isInterrupted(): boolean {
    return this.interruptRequested || this.controller.signal.aborted;
  }

  get reason(): string | null {
    return this.interruptReason;
  }

  getReason(): string {
    return this.interruptReason ?? 'user_interrupt';
  }

  markSettled(): void {
    this.settled = true;
  }

  onAbort(callback: AbortCallback): () => void {
    this.abortCallbacks.add(callback);
    if (this.signal.aborted) {
      void Promise.resolve(callback()).catch((error) =>
        console.debug(`Abort callback failed for already-aborted turn '${this.turnId}': ${String(error)}`)
      );
    }
    return () => {
      this.abortCallbacks.delete(callback);
    };
  }

  interrupt(reason?: string | null): AgentInterruptResult {
    const normalizedReason = normalizeInterruptReason(reason);
    if (this.settled) {
      return {
        accepted: false,
        status: 'already_settled',
        turnId: this.turnId,
        reason: this.interruptReason ?? normalizedReason,
        message: `Turn '${this.turnId}' is already settled.`
      };
    }

    if (this.interruptRequested) {
      return {
        accepted: true,
        status: 'already_interrupted',
        turnId: this.turnId,
        reason: this.interruptReason ?? normalizedReason,
        message: `Turn '${this.turnId}' has already been interrupted.`
      };
    }

    this.interruptRequested = true;
    this.interruptReason = normalizedReason;
    this.controller.abort(normalizedReason);

    for (const callback of Array.from(this.abortCallbacks)) {
      void Promise.resolve(callback()).catch((error) =>
        console.debug(`Abort callback failed for turn '${this.turnId}': ${String(error)}`)
      );
    }

    return {
      accepted: true,
      status: 'accepted',
      turnId: this.turnId,
      reason: normalizedReason
    };
  }

  throwIfAborted(meta: Omit<TurnOperationMeta, 'turnId'> & { turnId?: string }): void {
    throwIfAborted(
      { signal: this.signal, getReason: () => this.getReason() },
      { ...meta, turnId: meta.turnId ?? this.turnId }
    );
  }

  async runAbortable<T>(
    meta: Omit<TurnOperationMeta, 'turnId'> & { turnId?: string },
    run: () => Promise<T>
  ): Promise<T> {
    return racePromiseWithAbort(
      run(),
      { signal: this.signal, getReason: () => this.getReason() },
      { ...meta, turnId: meta.turnId ?? this.turnId }
    );
  }

  iterateAbortable<T>(
    meta: Omit<TurnOperationMeta, 'turnId'> & { turnId?: string },
    iterable: AsyncIterable<T>
  ): AsyncGenerator<T, void, unknown> {
    return iterateWithAbort(
      iterable,
      { signal: this.signal, getReason: () => this.getReason() },
      { ...meta, turnId: meta.turnId ?? this.turnId }
    );
  }
}
