import { BaseToolExecutionResultProcessor } from './base-processor.js';
import type { AgentContext } from '../context/agent-context.js';
import type { ToolResultEvent } from '../events/agent-events.js';
import { resolveToolCallFormat } from '../../utils/tool-call-format.js';

export class MemoryIngestToolResultProcessor extends BaseToolExecutionResultProcessor {
  static getOrder(): number {
    return 900;
  }

  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      return event;
    }

    const turnId = event.turnId ?? context.state.activeTurn?.turnId;
    const activeBatch = context.state.activeTurn?.activeToolInvocationBatch ?? null;
    const isActiveNativeBatchResult =
      resolveToolCallFormat() === 'api_tool_call' &&
      Boolean(
        activeBatch &&
          event.toolInvocationId &&
          activeBatch.accepts(event.toolInvocationId, turnId)
      );

    if (isActiveNativeBatchResult) {
      console.debug(
        `MemoryIngestToolResultProcessor deferred active native API batch result for turnId ${turnId}`
      );
      return event;
    }

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
