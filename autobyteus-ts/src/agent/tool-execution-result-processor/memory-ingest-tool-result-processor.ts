import { BaseToolExecutionResultProcessor } from './base-processor.js';
import type { AgentContext } from '../context/agent-context.js';
import type { ToolResultEvent } from '../events/agent-events.js';

export class MemoryIngestToolResultProcessor extends BaseToolExecutionResultProcessor {
  static getOrder(): number {
    return 900;
  }

  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      return event;
    }

    const turnId = (event as { turnId?: string }).turnId ?? context.state.activeTurnId;
    if (turnId) {
      memoryManager.ingestToolResult(event, turnId);
      console.debug(`MemoryIngestToolResultProcessor stored tool result for turnId ${turnId}`);
    } else {
      console.debug(
        `MemoryIngestToolResultProcessor skipping tool result without turnId for tool '${event.toolName}'.`
      );
    }

    return event;
  }
}
