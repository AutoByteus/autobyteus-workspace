import type { AgentContext } from '../context/agent-context.js';
import type { ToolInvocation } from '../tool-invocation.js';

export class BaseToolInvocationPreprocessor {
  constructor() {
    if (new.target === BaseToolInvocationPreprocessor) {
      throw new Error('BaseToolInvocationPreprocessor cannot be instantiated directly.');
    }
    if (this.process === BaseToolInvocationPreprocessor.prototype.process) {
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
    const ctor = this.constructor as typeof BaseToolInvocationPreprocessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseToolInvocationPreprocessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseToolInvocationPreprocessor;
    return ctor.isMandatory();
  }

  async process(
    _invocation: ToolInvocation,
    _context: AgentContext
  ): Promise<ToolInvocation> {
    throw new Error("Subclasses must implement the 'process' method.");
  }

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
