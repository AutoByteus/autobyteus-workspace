import type { AgentContext } from '../../context/agent-context.js';
import type {
  TurnStartEventInboxEntry,
  TurnStartEventResult
} from '../agent-event-inbox-entry.js';
import type { AgentEventProcessor } from './agent-event-processor.js';
import type { AgentTurnTrigger } from '../../loop/agent-turn-runner.js';

export type StartTurnTask = (trigger: AgentTurnTrigger) => Promise<TurnStartEventResult>;

export class TurnStartEventProcessor implements AgentEventProcessor<TurnStartEventInboxEntry> {
  constructor(private readonly startTurnTask: StartTurnTask) {}

  async process(entry: TurnStartEventInboxEntry, context: AgentContext): Promise<TurnStartEventResult> {
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
