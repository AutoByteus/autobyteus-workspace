import { ToolResultEvent } from '../events/agent-events.js';
import { ContextFile } from '../message/context-file.js';
import { ContextFileType } from '../message/context-file-type.js';
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
    const contextFiles = this.collectContextFiles(processedEvents);

    return new AgentInputUserMessage(
      isNativeApiMode ? 'Native API tool continuation' : 'Tool history continuation',
      SenderType.TOOL,
      contextFiles.length > 0 ? contextFiles : null,
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

  private collectContextFiles(processedEvents: ToolResultEvent[]): ContextFile[] {
    return processedEvents.flatMap((event) => this.extractContextFiles(event.result));
  }

  private extractContextFiles(result: unknown): ContextFile[] {
    if (result instanceof ContextFile) {
      return [result];
    }

    if (Array.isArray(result)) {
      return result.flatMap((item) => this.extractContextFiles(item));
    }

    const contextFile = this.tryHydrateContextFile(result);
    return contextFile ? [contextFile] : [];
  }

  private tryHydrateContextFile(result: unknown): ContextFile | null {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }

    const record = result as Record<string, unknown>;
    const uri = record.uri;
    if (typeof uri !== 'string' || uri.trim().length === 0) {
      return null;
    }

    const hasContextFileShape =
      'file_type' in record ||
      'fileType' in record ||
      'file_name' in record ||
      'fileName' in record ||
      'metadata' in record ||
      ContextFileType.fromPath(uri) !== ContextFileType.UNKNOWN;
    if (!hasContextFileShape) {
      return null;
    }

    return ContextFile.fromDict({
      uri,
      file_type: record.file_type ?? record.fileType ?? ContextFileType.UNKNOWN,
      file_name: record.file_name ?? record.fileName ?? null,
      metadata: record.metadata ?? {}
    });
  }
}
