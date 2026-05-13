import type { AgentContext } from '../../context/agent-context.js';
import type {
  TurnStartInboxMessage,
  TurnStartMessageResult
} from '../agent-inbox-message.js';
import type { AgentMessageHandler } from './agent-message-handler.js';
import type { AgentTurnTrigger } from '../../loop/agent-turn-runner.js';

export type StartTurnTask = (trigger: AgentTurnTrigger) => Promise<TurnStartMessageResult>;

export class TurnStartMessageHandler implements AgentMessageHandler<TurnStartInboxMessage> {
  readonly kind = 'user_message' as const;

  constructor(private readonly startTurnTask: StartTurnTask) {}

  async handle(message: TurnStartInboxMessage, context: AgentContext): Promise<TurnStartMessageResult> {
    if (context.state.activeTurn) {
      return {
        accepted: false,
        code: 'active_turn_exists',
        activeTurnId: context.state.activeTurn.turnId,
        message: `Agent '${context.agentId}' already has active turn '${context.state.activeTurn.turnId}'.`
      };
    }
    return this.startTurnTask(message.event);
  }
}
