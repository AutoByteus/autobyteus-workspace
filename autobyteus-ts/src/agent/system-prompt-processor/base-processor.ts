import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export class BaseSystemPromptProcessor {
  constructor() {
    if (new.target === BaseSystemPromptProcessor) {
      throw new Error("BaseSystemPromptProcessor cannot be instantiated directly.");
    }
    if (this.process === BaseSystemPromptProcessor.prototype.process) {
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
    const ctor = this.constructor as typeof BaseSystemPromptProcessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseSystemPromptProcessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseSystemPromptProcessor;
    return ctor.isMandatory();
  }

  process(
    _systemPrompt: string,
    _toolInstances: Record<string, BaseTool>,
    _agentId: string,
    _context: AgentContextLike
  ): string {
    throw new Error("Subclasses must implement the 'process' method.");
  }

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
