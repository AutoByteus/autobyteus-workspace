import type { AgentContext } from '../context/agent-context.js';
import type { LLMCompleteResponseReceivedEvent } from '../events/agent-events.js';
import type { CompleteResponse } from '../../llm/utils/response-types.js';

export class BaseLLMResponseProcessor {
  constructor() {
    if (new.target === BaseLLMResponseProcessor) {
      throw new Error('BaseLLMResponseProcessor cannot be instantiated directly.');
    }
    if (this.processResponse === BaseLLMResponseProcessor.prototype.processResponse) {
      throw new Error("Subclasses must implement the 'processResponse' method.");
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
    const ctor = this.constructor as typeof BaseLLMResponseProcessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseLLMResponseProcessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseLLMResponseProcessor;
    return ctor.isMandatory();
  }

  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _triggering_event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    throw new Error("Subclasses must implement the 'processResponse' method.");
  }

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
