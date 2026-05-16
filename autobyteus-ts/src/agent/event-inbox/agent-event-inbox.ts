import { SenderType } from '../sender-type.js';
import {
  BaseEvent,
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import type { PostToolApprovalResult } from '../tool-approval-result.js';
import { normalizeToolApprovalInvocationId } from '../tool-approval-result.js';
import type { PostToolResultResult } from '../tool-result-posting.js';
import { normalizeToolResultInvocationId } from '../tool-result-posting.js';
import { InboxQueueStore, type CancellableWait, type InboxLane } from './inbox-queue-store.js';
import type {
  AgentEventInboxCandidateSnapshot,
  AgentEventInboxEntry,
  InboxEventHandlerResult,
  ActiveTurnEventInboxEntry,
  RuntimeLifecycleEventInboxEntry,
  TurnStartEventInboxEntry
} from './agent-event-inbox-entry.js';

const INBOX_LANES: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;
const DRAIN_PRIORITY: readonly InboxLane[] = ['runtime_lifecycle', 'active_turn', 'turn_start'] as const;

let nextEntrySequence = 0;

const nextEntryId = (prefix: string): string => {
  nextEntrySequence += 1;
  return `${prefix}-${Date.now()}-${nextEntrySequence}`;
};

export class AgentEventInbox {
  constructor(private readonly store = new InboxQueueStore<AgentEventInboxEntry>(INBOX_LANES)) {}

  async postEvent(event: BaseEvent): Promise<void> {
    const entry = this.createEntry(event);
    this.store.enqueue(entry.lane, entry);
  }

  async postUserEvent(event: UserMessageReceivedEvent): Promise<void> {
    if (!(event instanceof UserMessageReceivedEvent)) {
      throw new TypeError('postUserEvent requires a UserMessageReceivedEvent.');
    }
    await this.postEvent(event);
  }

  async postInterAgentEvent(event: InterAgentMessageReceivedEvent): Promise<void> {
    if (!(event instanceof InterAgentMessageReceivedEvent)) {
      throw new TypeError('postInterAgentEvent requires an InterAgentMessageReceivedEvent.');
    }
    await this.postEvent(event);
  }

  async postLifecycleEvent(event: LifecycleEvent): Promise<void> {
    if (!(event instanceof LifecycleEvent)) {
      throw new TypeError('postLifecycleEvent requires a LifecycleEvent.');
    }
    await this.postEvent(event);
  }

  async postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult> {
    if (!(event instanceof ToolExecutionApprovalEvent)) {
      throw new TypeError('postToolApprovalEvent requires a ToolExecutionApprovalEvent.');
    }
    return this.postAwaitable(event) as Promise<PostToolApprovalResult>;
  }

  async postToolResultEvent(event: ToolResultEvent): Promise<PostToolResultResult> {
    if (!(event instanceof ToolResultEvent)) {
      throw new TypeError('postToolResultEvent requires a ToolResultEvent.');
    }
    return this.postAwaitable(event) as Promise<PostToolResultResult>;
  }

  async postAwaitable(event: BaseEvent): Promise<InboxEventHandlerResult> {
    const entry = this.createEntry(event);
    return new Promise<InboxEventHandlerResult>((resolve, reject) => {
      entry.awaitable = { resolve, reject };
      this.store.enqueue(entry.lane, entry);
    });
  }

  waitForAvailability(options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.store.waitForAvailability(options.signal);
  }

  createAvailabilityWaiter(options: { signal?: AbortSignal } = {}): CancellableWait {
    return this.store.createAvailabilityWaiter(options.signal);
  }

  get availabilityVersion(): number {
    return this.store.version;
  }

  wakeAvailability(): void {
    this.store.wakeAvailability();
  }

  peekCandidates(): AgentEventInboxCandidateSnapshot {
    return this.store.snapshot();
  }

  peekFirst(lane: InboxLane): AgentEventInboxEntry | null {
    return this.store.peekFirst(lane);
  }

  claim(entryId: string): AgentEventInboxEntry | null {
    return this.store.claim(entryId);
  }

  claimFirst(lane: InboxLane): AgentEventInboxEntry | null {
    const candidate = this.peekFirst(lane);
    return candidate ? this.claim(candidate.entryId) : null;
  }

  resolveAwaitable(entry: AgentEventInboxEntry, result: InboxEventHandlerResult): void {
    entry.awaitable?.resolve(result);
    entry.awaitable = undefined;
  }

  rejectAwaitable(entry: AgentEventInboxEntry, error: unknown): void {
    entry.awaitable?.reject(error);
    entry.awaitable = undefined;
  }

  drainForShutdown(): AgentEventInboxEntry[] {
    return this.store.drain(DRAIN_PRIORITY);
  }

  settleQueuedAwaitablesForShutdown(agentId: string): AgentEventInboxEntry[] {
    const drained = this.drainForShutdown();
    for (const entry of drained) {
      if (!entry.awaitable) {
        continue;
      }

      const event = entry.event;
      if (event instanceof ToolExecutionApprovalEvent) {
        this.resolveAwaitable(entry, {
          accepted: false,
          code: 'runtime_stopped',
          invocationId: event.toolInvocationId,
          message: `Agent '${agentId}' runtime is stopping.`
        });
        continue;
      }

      if (event instanceof ToolResultEvent) {
        this.resolveAwaitable(entry, {
          accepted: false,
          code: 'runtime_stopped',
          invocationId: event.toolInvocationId ?? '',
          message: `Agent '${agentId}' runtime is stopping.`
        });
        continue;
      }

      if (event instanceof UserMessageReceivedEvent || event instanceof InterAgentMessageReceivedEvent) {
        this.resolveAwaitable(entry, {
          accepted: false,
          code: 'runtime_stopping',
          message: `Agent '${agentId}' runtime is stopping.`
        });
        continue;
      }

      if (event instanceof LifecycleEvent) {
        this.resolveAwaitable(entry, {
          accepted: true,
          code: 'shutdown_requested',
          stopRequested: true
        });
      }
    }
    return drained;
  }

  qsize(lane?: InboxLane): number {
    return this.store.qsize(lane);
  }

  private createEntry(event: BaseEvent): AgentEventInboxEntry {
    if (!(event instanceof BaseEvent)) {
      throw new TypeError('AgentEventInbox requires a BaseEvent instance.');
    }

    if (event instanceof UserMessageReceivedEvent) {
      if (event.agentInputUserMessage.senderType === SenderType.TOOL) {
        throw new Error('AgentEventInbox rejects same-turn TOOL continuations; route them through TurnToolInputPort/turn runner flow.');
      }
      return this.createTurnStartEntry(event, 'user');
    }

    if (event instanceof InterAgentMessageReceivedEvent) {
      return this.createTurnStartEntry(event, 'inter-agent');
    }

    if (event instanceof ToolExecutionApprovalEvent) {
      const invocationId = normalizeToolApprovalInvocationId(event.toolInvocationId);
      if (!invocationId) {
        throw new TypeError('ToolExecutionApprovalEvent requires a non-empty toolInvocationId.');
      }
      event.toolInvocationId = invocationId;
      return this.createActiveTurnEntry(event, 'tool-approval');
    }

    if (event instanceof ToolResultEvent) {
      const invocationId = normalizeToolResultInvocationId(event.toolInvocationId);
      if (!invocationId) {
        throw new TypeError('ToolResultEvent requires a non-empty toolInvocationId for runtime posting.');
      }
      event.toolInvocationId = invocationId;
      return this.createActiveTurnEntry(event, 'tool-result');
    }

    if (event instanceof LifecycleEvent) {
      return this.createLifecycleEntry(event);
    }

    throw new TypeError(
      `AgentEventInbox rejects unsupported runtime input event '${event.constructor.name}'. ` +
      'Route turn-local operational events through AgentTurnRunner/TurnToolInputPort.'
    );
  }

  private createTurnStartEntry(
    event: UserMessageReceivedEvent | InterAgentMessageReceivedEvent,
    idPrefix: string
  ): TurnStartEventInboxEntry {
    return { entryId: nextEntryId(idPrefix), lane: 'turn_start', event };
  }

  private createLifecycleEntry(event: LifecycleEvent): RuntimeLifecycleEventInboxEntry {
    return { entryId: nextEntryId('lifecycle'), lane: 'runtime_lifecycle', event };
  }

  private createActiveTurnEntry(
    event: ToolExecutionApprovalEvent | ToolResultEvent,
    idPrefix: string
  ): ActiveTurnEventInboxEntry {
    return { entryId: nextEntryId(idPrefix), lane: 'active_turn', event };
  }
}
