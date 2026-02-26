import type { AgentContext } from '../context/agent-context.js';

export abstract class BaseShutdownStep {
  abstract execute(context: AgentContext): Promise<boolean>;

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
