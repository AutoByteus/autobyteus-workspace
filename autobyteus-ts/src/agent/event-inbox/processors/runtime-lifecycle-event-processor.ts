import {
  AgentStoppedEvent,
  BaseEvent,
  ShutdownRequestedEvent
} from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type {
  RuntimeLifecycleEventInboxEntry,
  RuntimeLifecycleEventResult
} from '../agent-event-inbox-entry.js';
import type { AgentEventProcessor } from './agent-event-processor.js';

export type ApplyLifecycleStatusEvent = (event: BaseEvent) => Promise<void>;
export type RequestWorkerStop = () => void;

export class RuntimeLifecycleEventProcessor implements AgentEventProcessor<RuntimeLifecycleEventInboxEntry> {
  constructor(
    private readonly applyStatusEvent: ApplyLifecycleStatusEvent,
    private readonly requestStop: RequestWorkerStop
  ) {}

  async process(entry: RuntimeLifecycleEventInboxEntry, _context: AgentContext): Promise<RuntimeLifecycleEventResult> {
    await this.applyStatusEvent(entry.event);
    if (entry.event instanceof ShutdownRequestedEvent || entry.event instanceof AgentStoppedEvent) {
      this.requestStop();
      return { accepted: true, code: 'shutdown_requested', stopRequested: true };
    }
    return { accepted: true, code: 'lifecycle_applied' };
  }
}
