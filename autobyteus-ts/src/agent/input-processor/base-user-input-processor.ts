import type { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import type { AgentContext } from '../context/agent-context.js';
import type { UserMessageReceivedEvent } from '../events/agent-events.js';

export class BaseAgentUserInputMessageProcessor {
  constructor() {
    if (new.target === BaseAgentUserInputMessageProcessor) {
      throw new Error('BaseAgentUserInputMessageProcessor cannot be instantiated directly.');
    }
    if (this.process === BaseAgentUserInputMessageProcessor.prototype.process) {
      throw new Error("Subclasses must implement the 'process' method.");
    }
  }

  static getName(): string {
    return this.name;
  }

  static getOrder(): number {
    return 500;
  }

  static isMandatory(): boolean {
    return false;
  }

  getName(): string {
    const ctor = this.constructor as typeof BaseAgentUserInputMessageProcessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseAgentUserInputMessageProcessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseAgentUserInputMessageProcessor;
    return ctor.isMandatory();
  }

  async process(
    _message: AgentInputUserMessage,
    _context: AgentContext,
    _triggering_event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    throw new Error("Subclasses must implement the 'process' method.");
  }

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
