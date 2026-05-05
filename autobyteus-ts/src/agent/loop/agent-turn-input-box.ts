import type { ToolExecutionApprovalEvent, ToolResultEvent } from '../events/agent-events.js';
import type { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { AgentInterruptionError } from '../interruption/agent-interruption.js';

export type TurnInputBoxCloseReason = 'completed' | 'interrupted' | 'failed' | 'stopped';

export type PostTurnMessageResult = {
  accepted: boolean;
  code?: 'closed' | 'turn_mismatch' | 'unknown_invocation' | 'duplicate' | 'accepted';
  message?: string;
};

type Waiter<T> = {
  predicate: (item: T) => boolean;
  resolve: (item: T) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
};

const getApprovalTurnId = (event: ToolExecutionApprovalEvent): string | null =>
  typeof event.turnId === 'string' ? event.turnId : null;

const normalizeInvocationId = (invocationId: unknown): string | null => {
  if (typeof invocationId !== 'string') {
    return null;
  }
  const trimmed = invocationId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class AgentTurnInputBox {
  readonly turnId: string;
  private closed = false;
  private closeReason: TurnInputBoxCloseReason | null = null;
  private readonly knownToolInvocationIds = new Set<string>();
  private readonly settledToolResultIds = new Set<string>();
  private readonly settledApprovalIds = new Set<string>();
  private readonly toolResults: ToolResultEvent[] = [];
  private readonly approvals: ToolExecutionApprovalEvent[] = [];
  private readonly continuations: AgentInputUserMessage[] = [];
  private readonly resultWaiters: Array<Waiter<ToolResultEvent>> = [];
  private readonly approvalWaiters: Array<Waiter<ToolExecutionApprovalEvent>> = [];

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

  postToolResult(event: ToolResultEvent): PostTurnMessageResult {
    if (this.closed) {
      return { accepted: false, code: 'closed', message: `Turn input box is closed (${this.closeReason}).` };
    }
    if (event.turnId && event.turnId !== this.turnId) {
      return { accepted: false, code: 'turn_mismatch', message: `Expected turn '${this.turnId}', got '${event.turnId}'.` };
    }
    const invocationId = normalizeInvocationId(event.toolInvocationId);
    if (!invocationId || !this.knownToolInvocationIds.has(invocationId)) {
      return {
        accepted: false,
        code: 'unknown_invocation',
        message: `Tool result invocation '${event.toolInvocationId ?? 'unknown'}' is not active for turn '${this.turnId}'.`
      };
    }
    if (
      this.settledToolResultIds.has(invocationId) ||
      this.toolResults.some((queued) => queued.toolInvocationId === invocationId)
    ) {
      return {
        accepted: false,
        code: 'duplicate',
        message: `Tool result invocation '${invocationId}' was already accepted for turn '${this.turnId}'.`
      };
    }
    event.turnId = this.turnId;
    const waiterIndex = this.resultWaiters.findIndex((waiter) => waiter.predicate(event));
    if (waiterIndex >= 0) {
      const [waiter] = this.resultWaiters.splice(waiterIndex, 1);
      this.detachAbort(waiter);
      this.settledToolResultIds.add(invocationId);
      waiter.resolve(event);
      return { accepted: true, code: 'accepted' };
    }
    this.toolResults.push(event);
    return { accepted: true, code: 'accepted' };
  }

  postApproval(event: ToolExecutionApprovalEvent): PostTurnMessageResult {
    if (this.closed) {
      return { accepted: false, code: 'closed', message: `Turn input box is closed (${this.closeReason}).` };
    }
    const eventTurnId = getApprovalTurnId(event);
    if (eventTurnId && eventTurnId !== this.turnId) {
      return { accepted: false, code: 'turn_mismatch', message: `Expected turn '${this.turnId}', got '${eventTurnId}'.` };
    }
    const invocationId = normalizeInvocationId(event.toolInvocationId);
    if (!invocationId || !this.knownToolInvocationIds.has(invocationId)) {
      return {
        accepted: false,
        code: 'unknown_invocation',
        message: `Tool approval invocation '${event.toolInvocationId ?? 'unknown'}' is not active for turn '${this.turnId}'.`
      };
    }
    if (
      this.settledApprovalIds.has(invocationId) ||
      this.approvals.some((queued) => queued.toolInvocationId === invocationId)
    ) {
      return {
        accepted: false,
        code: 'duplicate',
        message: `Tool approval invocation '${invocationId}' was already accepted for turn '${this.turnId}'.`
      };
    }
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

  postContinuation(message: AgentInputUserMessage): PostTurnMessageResult {
    if (this.closed) {
      return { accepted: false, code: 'closed', message: `Turn input box is closed (${this.closeReason}).` };
    }
    this.continuations.push(message);
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

  waitForToolResult(
    invocationId: string,
    options: { signal: AbortSignal; reason?: () => string }
  ): Promise<ToolResultEvent> {
    this.registerToolInvocation(invocationId);
    const existingIndex = this.toolResults.findIndex((event) => event.toolInvocationId === invocationId);
    if (existingIndex >= 0) {
      const [event] = this.toolResults.splice(existingIndex, 1);
      this.settledToolResultIds.add(invocationId);
      return Promise.resolve(event);
    }
    return this.waitFor(this.resultWaiters, (event) => event.toolInvocationId === invocationId, options);
  }

  close(reason: TurnInputBoxCloseReason): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.closeReason = reason;
    const error = new AgentInterruptionError({ turnId: this.turnId, reason });
    for (const waiter of [...this.resultWaiters, ...this.approvalWaiters]) {
      this.detachAbort(waiter as Waiter<any>);
      waiter.reject(error);
    }
    this.resultWaiters.length = 0;
    this.approvalWaiters.length = 0;
    this.toolResults.length = 0;
    this.approvals.length = 0;
    this.continuations.length = 0;
    this.knownToolInvocationIds.clear();
    this.settledToolResultIds.clear();
    this.settledApprovalIds.clear();
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
