import { ToolResultEvent } from '../events/agent-events.js';
import { ContextFile } from '../message/context-file.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';
import { resolveToolCallFormat } from '../../utils/tool-call-format.js';
import {
  NATIVE_API_TOOL_CONTINUATION_MODE,
  TOOL_CONTINUATION_MODE_METADATA_KEY
} from '../message/tool-continuation-metadata.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';

export class ToolResultContinuationBuilder {
  build(
    processedEvents: ToolResultEvent[],
    options: { context?: AgentContext | null; turn?: AgentTurn | null } = {}
  ): AgentInputUserMessage {
    if (resolveToolCallFormat() === 'api_tool_call' && options.context && options.turn) {
      return this.buildNativeApiContinuation(processedEvents, options.context, options.turn);
    }

    return this.buildSyntheticUserContinuation(processedEvents);
  }

  private buildNativeApiContinuation(
    processedEvents: ToolResultEvent[],
    context: AgentContext,
    turn: AgentTurn
  ): AgentInputUserMessage {
    const turnId = this.resolveContinuationTurnId(processedEvents, turn);
    if (!turnId) {
      throw new Error(
        `Agent '${context.agentId}' cannot continue native API tool results without an active turn or result turnId.`
      );
    }

    context.state.memoryManager?.ingestToolResults(processedEvents, turnId, {
      source: 'native_api_ordered_batch'
    });

    return new AgentInputUserMessage(
      'Native API tool continuation',
      SenderType.TOOL,
      null,
      {
        [TOOL_CONTINUATION_MODE_METADATA_KEY]: NATIVE_API_TOOL_CONTINUATION_MODE,
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

  private buildSyntheticUserContinuation(processedEvents: ToolResultEvent[]): AgentInputUserMessage {
    const aggregatedContentParts: string[] = [];
    const mediaContextFiles: ContextFile[] = [];

    for (const processedEvent of processedEvents) {
      const toolInvocationId = processedEvent.toolInvocationId ?? 'N/A';

      if (processedEvent.isDenied) {
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Denied\n` +
            `Details: ${processedEvent.error ?? 'Tool execution denied.'}`
        );
        continue;
      }

      let resultIsMedia = false;
      if (processedEvent.result instanceof ContextFile) {
        mediaContextFiles.push(processedEvent.result);
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result: The file '${processedEvent.result.fileName}' has been loaded into the context for you to view.`
        );
        resultIsMedia = true;
      } else if (
        Array.isArray(processedEvent.result) &&
        processedEvent.result.every((item) => item instanceof ContextFile)
      ) {
        const contextFiles = processedEvent.result as ContextFile[];
        mediaContextFiles.push(...contextFiles);
        const fileNames = contextFiles
          .map((cf) => cf.fileName)
          .filter((name): name is string => Boolean(name));
        const fileList = `[${fileNames.map((name) => `'${name}'`).join(', ')}]`;
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result: The following files have been loaded into the context for you to view: ${fileList}`
        );
        resultIsMedia = true;
      }

      if (resultIsMedia) {
        continue;
      }

      if (processedEvent.error) {
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Error\n` +
            `Details: ${processedEvent.error}`
        );
      } else {
        const resultStr = formatToCleanString(processedEvent.result);
        aggregatedContentParts.push(
          `Tool: ${processedEvent.toolName} (ID: ${toolInvocationId})\n` +
            `Status: Success\n` +
            `Result:\n${resultStr}`
        );
      }
    }

    const finalContentForLLM =
      'The following tool executions have completed. Please analyze their results and decide the next course of action.\n\n' +
      aggregatedContentParts.join('\n\n---\n\n');

    return new AgentInputUserMessage(
      finalContentForLLM,
      SenderType.TOOL,
      mediaContextFiles.length > 0 ? mediaContextFiles : null
    );
  }
}
