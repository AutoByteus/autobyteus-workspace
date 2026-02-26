import type { BaseEvent } from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';

export abstract class AgentEventHandler {
  abstract handle(event: BaseEvent, context: AgentContext): Promise<void>;

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
