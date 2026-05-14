import {
  AgentStoppedEvent,
  BaseEvent,
  LifecycleEvent,
  ShutdownRequestedEvent
} from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type {
  RuntimeLifecycleEventInboxEntry,
  RuntimeLifecycleEventResult,
  AgentEventInboxEntry
} from '../agent-event-inbox-entry.js';
import type { InboxEventHandler } from './inbox-event-handler.js';

export type ApplyLifecycleStatusEvent = (event: BaseEvent) => Promise<void>;
export type RequestWorkerStop = () => void;

export class RuntimeLifecycleInboxEventHandler implements InboxEventHandler<RuntimeLifecycleEventInboxEntry> {
  constructor(
    private readonly applyStatusEvent: ApplyLifecycleStatusEvent,
    private readonly requestStop: RequestWorkerStop
  ) {}

  canHandle(entry: AgentEventInboxEntry): entry is RuntimeLifecycleEventInboxEntry {
    return entry.lane === 'runtime_lifecycle' && entry.event instanceof LifecycleEvent;
  }

  async handle(entry: RuntimeLifecycleEventInboxEntry, _context: AgentContext): Promise<RuntimeLifecycleEventResult> {
    await this.applyStatusEvent(entry.event);
    if (entry.event instanceof ShutdownRequestedEvent || entry.event instanceof AgentStoppedEvent) {
      this.requestStop();
      return { accepted: true, code: 'shutdown_requested', stopRequested: true };
    }
    return { accepted: true, code: 'lifecycle_applied' };
  }
}
