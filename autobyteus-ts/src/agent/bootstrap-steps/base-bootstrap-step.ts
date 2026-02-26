import type { AgentContext } from '../context/agent-context.js';

export abstract class BaseBootstrapStep {
  abstract execute(context: AgentContext): Promise<boolean>;

  toString(): string {
    return `<${this.constructor.name}>`;
  }
}
