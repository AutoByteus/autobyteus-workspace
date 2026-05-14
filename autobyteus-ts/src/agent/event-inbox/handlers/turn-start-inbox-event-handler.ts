import { InterAgentMessageReceivedEvent, UserMessageReceivedEvent } from '../../events/agent-events.js';
import type { AgentContext } from '../../context/agent-context.js';
import type {
  AgentEventInboxEntry,
  TurnStartEventInboxEntry,
  TurnStartEventResult
} from '../agent-event-inbox-entry.js';
import type { InboxEventHandler } from './inbox-event-handler.js';
import type { AgentTurnTrigger } from '../../loop/agent-turn-runner.js';

export type StartTurnTask = (trigger: AgentTurnTrigger) => Promise<TurnStartEventResult>;

export class TurnStartInboxEventHandler implements InboxEventHandler<TurnStartEventInboxEntry> {
  constructor(private readonly startTurnTask: StartTurnTask) {}

  canHandle(entry: AgentEventInboxEntry): entry is TurnStartEventInboxEntry {
    return (
      entry.lane === 'turn_start' &&
      (entry.event instanceof UserMessageReceivedEvent || entry.event instanceof InterAgentMessageReceivedEvent)
    );
  }

  async handle(entry: TurnStartEventInboxEntry, context: AgentContext): Promise<TurnStartEventResult> {
    if (context.state.activeTurn) {
      return {
        accepted: false,
        code: 'active_turn_exists',
        activeTurnId: context.state.activeTurn.turnId,
        message: `Agent '${context.agentId}' already has active turn '${context.state.activeTurn.turnId}'.`
      };
    }
    return this.startTurnTask(entry.event);
  }
}
