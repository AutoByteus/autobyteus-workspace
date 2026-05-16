import { ToolExecutionApprovalEvent, ToolResultEvent } from '../events/agent-events.js';
import { AgentInterruptionError } from '../interruption/agent-interruption.js';

export type TurnToolInputPortCloseReason = 'completed' | 'interrupted' | 'failed' | 'stopped';

export type PostTurnToolMessageResult = {
  accepted: boolean;
  code?: 'closed' | 'turn_mismatch' | 'unknown_invocation' | 'duplicate' | 'no_waiter' | 'accepted';
  message?: string;
};

type ToolPortEvent = ToolExecutionApprovalEvent | ToolResultEvent;

type Waiter<T> = {
  predicate: (item: T) => boolean;
  resolve: (item: T) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
};

const getTurnId = (event: { turnId?: string }): string | null =>
  typeof event.turnId === 'string' ? event.turnId : null;

const getInvocationId = (event: ToolPortEvent): string | undefined => event.toolInvocationId;

const normalizeInvocationId = (invocationId: unknown): string | null => {
  if (typeof invocationId !== 'string') {
    return null;
  }
  const trimmed = invocationId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class TurnToolInputPort {
  readonly turnId: string;
  private closed = false;
  private closeReason: TurnToolInputPortCloseReason | null = null;
  private readonly knownToolInvocationIds = new Set<string>();
  private readonly settledApprovalIds = new Set<string>();
  private readonly settledResultIds = new Set<string>();
  private readonly approvals: ToolExecutionApprovalEvent[] = [];
  private readonly approvalWaiters: Array<Waiter<ToolExecutionApprovalEvent>> = [];
  private readonly resultWaiters: Array<Waiter<ToolResultEvent>> = [];

  constructor(turnId: string) {
    this.turnId = turnId;
  }

  registerToolInvocation(invocationId: string): void {
    const normalized = normalizeInvocationId(invocationId);
    if (normalized) {
      this.knownToolInvocationIds.add(normalized);
    }
  }

  registerToolInvocations(invocationIds: Iterable<string>): void {
    for (const invocationId of invocationIds) {
      this.registerToolInvocation(invocationId);
    }
  }

  postApproval(event: ToolExecutionApprovalEvent): PostTurnToolMessageResult {
    const validation = this.validatePost(event, this.settledApprovalIds, this.approvals);
    if (!validation.accepted || !('invocationId' in validation)) {
      return validation;
    }

    const invocationId = validation.invocationId;
    event.toolInvocationId = invocationId;
    event.turnId = this.turnId;
    const waiterIndex = this.approvalWaiters.findIndex((waiter) => waiter.predicate(event));
    if (waiterIndex >= 0) {
      const [waiter] = this.approvalWaiters.splice(waiterIndex, 1);
      this.detachAbort(waiter);
      this.settledApprovalIds.add(invocationId);
      waiter.resolve(event);
      return { accepted: true, code: 'accepted' };
    }

    this.approvals.push(event);
    return { accepted: true, code: 'accepted' };
  }

  waitForApproval(
    invocationId: string,
    options: { signal: AbortSignal; reason?: () => string }
  ): Promise<ToolExecutionApprovalEvent> {
    this.registerToolInvocation(invocationId);
    const existingIndex = this.approvals.findIndex((event) => event.toolInvocationId === invocationId);
    if (existingIndex >= 0) {
      const [event] = this.approvals.splice(existingIndex, 1);
      this.settledApprovalIds.add(invocationId);
      return Promise.resolve(event);
    }
    return this.waitFor(this.approvalWaiters, (event) => event.toolInvocationId === invocationId, options);
  }

  postToolResult(event: ToolResultEvent): PostTurnToolMessageResult {
    const validation = this.validatePost(event, this.settledResultIds, []);
    if (!validation.accepted || !('invocationId' in validation)) {
      return validation;
    }

    const invocationId = validation.invocationId;
    event.toolInvocationId = invocationId;
    event.turnId = this.turnId;
    const waiterIndex = this.resultWaiters.findIndex((waiter) => waiter.predicate(event));
    if (waiterIndex >= 0) {
      const [waiter] = this.resultWaiters.splice(waiterIndex, 1);
      this.detachAbort(waiter);
      this.settledResultIds.add(invocationId);
      waiter.resolve(event);
      return { accepted: true, code: 'accepted' };
    }

    return {
      accepted: false,
      code: 'no_waiter',
      message: `Tool invocation '${invocationId}' has no active result waiter for turn '${this.turnId}'.`
    };
  }

  hasToolResultWaiter(invocationId: string): boolean {
    const normalized = normalizeInvocationId(invocationId);
    if (!normalized) {
      return false;
    }
    return this.resultWaiters.some((waiter) =>
      waiter.predicate(new ToolResultEvent('', null, normalized, undefined, undefined, this.turnId))
    );
  }

  waitForToolResult(
    invocationId: string,
    options: { signal: AbortSignal; reason?: () => string }
  ): Promise<ToolResultEvent> {
    this.registerToolInvocation(invocationId);
    return this.waitFor(this.resultWaiters, (event) => event.toolInvocationId === invocationId, options);
  }

  async waitForToolResults(
    expectedInvocationIds: string[],
    options: { signal: AbortSignal; reason?: () => string }
  ): Promise<ToolResultEvent[]> {
    return Promise.all(expectedInvocationIds.map((invocationId) => this.waitForToolResult(invocationId, options)));
  }

  close(reason: TurnToolInputPortCloseReason): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.closeReason = reason;
    const error = new AgentInterruptionError({ turnId: this.turnId, reason });
    for (const waiter of [...this.approvalWaiters, ...this.resultWaiters]) {
      this.detachAbort(waiter as Waiter<any>);
      waiter.reject(error);
    }
    this.approvalWaiters.length = 0;
    this.resultWaiters.length = 0;
    this.approvals.length = 0;
    this.knownToolInvocationIds.clear();
    this.settledApprovalIds.clear();
    this.settledResultIds.clear();
  }

  private validatePost<T extends ToolPortEvent>(
    event: T,
    settledIds: Set<string>,
    queuedEvents: T[]
  ): { accepted: true; invocationId: string } | PostTurnToolMessageResult {
    if (this.closed) {
      return { accepted: false, code: 'closed', message: `Turn tool input port is closed (${this.closeReason}).` };
    }
    const eventTurnId = getTurnId(event);
    if (eventTurnId && eventTurnId !== this.turnId) {
      return { accepted: false, code: 'turn_mismatch', message: `Expected turn '${this.turnId}', got '${eventTurnId}'.` };
    }
    const invocationId = normalizeInvocationId(getInvocationId(event));
    if (!invocationId || !this.knownToolInvocationIds.has(invocationId)) {
      return {
        accepted: false,
        code: 'unknown_invocation',
        message: `Tool invocation '${getInvocationId(event) ?? 'unknown'}' is not active for turn '${this.turnId}'.`
      };
    }
    if (settledIds.has(invocationId) || queuedEvents.some((queued) => getInvocationId(queued) === invocationId)) {
      return {
        accepted: false,
        code: 'duplicate',
        message: `Tool invocation '${invocationId}' was already accepted for turn '${this.turnId}'.`
      };
    }
    return { accepted: true, invocationId };
  }

  private waitFor<T>(
    waiters: Array<Waiter<T>>,
    predicate: (item: T) => boolean,
    options: { signal: AbortSignal; reason?: () => string }
  ): Promise<T> {
    if (this.closed) {
      return Promise.reject(new AgentInterruptionError({ turnId: this.turnId, reason: this.closeReason ?? 'closed' }));
    }
    if (options.signal.aborted) {
      return Promise.reject(new AgentInterruptionError({
        turnId: this.turnId,
        reason: options.reason?.() ?? 'interrupted'
      }));
    }
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter<T> = { predicate, resolve, reject, signal: options.signal };
      waiter.abortListener = () => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) {
          waiters.splice(index, 1);
        }
        reject(new AgentInterruptionError({
          turnId: this.turnId,
          reason: options.reason?.() ?? 'interrupted'
        }));
      };
      options.signal.addEventListener('abort', waiter.abortListener, { once: true });
      waiters.push(waiter);
    });
  }

  private detachAbort(waiter: Waiter<any>): void {
    if (waiter.abortListener && waiter.signal) {
      waiter.signal.removeEventListener('abort', waiter.abortListener);
      waiter.abortListener = undefined;
      waiter.signal = undefined;
    }
  }
}
