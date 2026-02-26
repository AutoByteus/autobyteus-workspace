import type { AgentContext } from '../context/agent-context.js';
import { BaseShutdownStep } from './base-shutdown-step.js';

export class LLMInstanceCleanupStep extends BaseShutdownStep {
  constructor() {
    super();
  }

  async execute(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    const llmInstance: any = context.llmInstance;

    if (!llmInstance) {
      console.debug(`Agent '${agentId}': No LLM instance found in context. Skipping cleanup.`);
      return true;
    }

    const cleanupFunc = (llmInstance as any).cleanup;
    if (typeof cleanupFunc !== 'function') {
      console.debug(
        `Agent '${agentId}': LLM instance of type '${llmInstance.constructor?.name ?? 'unknown'}' does not have a 'cleanup' method. Skipping.`
      );
      return true;
    }

    try {
      const result = cleanupFunc.call(llmInstance);
      if (result && typeof result.then === 'function') {
        await result;
      }
      return true;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      console.error(`Agent '${agentId}': Error during LLM instance cleanup: ${message}`);
      return false;
    }
  }
}
