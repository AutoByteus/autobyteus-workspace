import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';
import { getBackgroundManager, type AgentContextLike } from '../../tools/terminal/background-process-context.js';

/**
 * Run end owns the run's commands: every command group the agent's `run_bash` calls left (background tasks and
 * their processes) is stopped through the host scope, those ends are never reported, and the agent's output
 * logs are removed. Never fails the shutdown: a stop that is not confirmed is logged; the host scope closes it
 * at quit.
 */
export class BackgroundProcessCleanupStep extends BaseShutdownStep {
  async execute(context: AgentContext): Promise<boolean> {
    try {
      const unconfirmed = await getBackgroundManager(context as unknown as AgentContextLike).stopAllForRunEnd();
      if (unconfirmed.length)
        console.warn(`Agent '${context.agentId}': background command stop unconfirmed at run end: ${unconfirmed.join('; ')}`);
    } catch (error) {
      console.warn(`Agent '${context.agentId}': background command cleanup failed: ${String(error)}`);
    }
    return true;
  }
}
