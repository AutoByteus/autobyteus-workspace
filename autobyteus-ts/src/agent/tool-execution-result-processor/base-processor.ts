import type { AgentContext } from '../context/agent-context.js';
import type { ToolResultEvent } from '../events/agent-events.js';

export class BaseToolExecutionResultProcessor {
  constructor() {
    if (new.target === BaseToolExecutionResultProcessor) {
      throw new Error('BaseToolExecutionResultProcessor cannot be instantiated directly.');
    }
    if (this.process === BaseToolExecutionResultProcessor.prototype.process) {
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
    const ctor = this.constructor as typeof BaseToolExecutionResultProcessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseToolExecutionResultProcessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseToolExecutionResultProcessor;
    return ctor.isMandatory();
  }

  async process(
    _event: ToolResultEvent,
    _context: AgentContext
  ): Promise<ToolResultEvent> {
    throw new Error("Subclasses must implement the 'process' method.");
  }

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
