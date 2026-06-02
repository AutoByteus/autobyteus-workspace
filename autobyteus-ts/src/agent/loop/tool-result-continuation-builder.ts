import { ToolResultEvent } from '../events/agent-events.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import { resolveToolCallFormat } from '../../utils/tool-call-format.js';
import {
  NATIVE_API_TOOL_CONTINUATION_MODE,
  TOOL_HISTORY_ONLY_CONTINUATION_MODE,
  TOOL_CONTINUATION_MODE_METADATA_KEY
} from '../message/tool-continuation-metadata.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';

export class ToolResultContinuationBuilder {
  build(
    processedEvents: ToolResultEvent[],
    options: { context?: AgentContext | null; turn?: AgentTurn | null } = {}
  ): AgentInputUserMessage {
    if (options.context && options.turn) {
      return this.buildToolHistoryContinuation(processedEvents, options.context, options.turn);
    }

    throw new Error('ToolResultContinuationBuilder requires context and turn for canonical tool-history continuation.');
  }

  private buildToolHistoryContinuation(
    processedEvents: ToolResultEvent[],
    context: AgentContext,
    turn: AgentTurn
  ): AgentInputUserMessage {
    const turnId = this.resolveContinuationTurnId(processedEvents, turn);
    if (!turnId) {
      throw new Error(
        `Agent '${context.agentId}' cannot continue tool results without an active turn or result turnId.`
      );
    }

    const isNativeApiMode = resolveToolCallFormat() === 'api_tool_call';
    context.state.memoryManager?.ingestToolResults(processedEvents, turnId, {
      source: isNativeApiMode ? 'native_api_ordered_batch' : 'text_history_ordered_batch'
    });

    return new AgentInputUserMessage(
      isNativeApiMode ? 'Native API tool continuation' : 'Tool history continuation',
      SenderType.TOOL,
      null,
      {
        [TOOL_CONTINUATION_MODE_METADATA_KEY]: isNativeApiMode
          ? NATIVE_API_TOOL_CONTINUATION_MODE
          : TOOL_HISTORY_ONLY_CONTINUATION_MODE,
        turn_id: turnId,
        tool_result_count: processedEvents.length
      }
    );
  }

  private resolveContinuationTurnId(processedEvents: ToolResultEvent[], turn: AgentTurn): string | null {
    for (const processedEvent of processedEvents) {
      if (typeof processedEvent.turnId === 'string' && processedEvent.turnId.trim().length > 0) {
        return processedEvent.turnId.trim();
      }
    }
    return turn.turnId ?? null;
  }
}
