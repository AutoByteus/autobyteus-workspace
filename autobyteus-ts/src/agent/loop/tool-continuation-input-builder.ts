import { ToolResultEvent } from '../events/agent-events.js';
import { ContextFile } from '../message/context-file.js';
import { ContextFileType } from '../message/context-file-type.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import {
  buildToolContinuationDisplayText,
  type CompletedToolContinuationSummary
} from '../message/tool-continuation-display-text.js';

export class ToolContinuationInputBuilder {
  build(processedEvents: ToolResultEvent[], turnId: string): AgentInputUserMessage {
    const normalizedTurnId = turnId.trim();
    if (!normalizedTurnId) {
      throw new Error('ToolContinuationInputBuilder requires a non-empty turnId.');
    }

    const contextFiles = this.collectContextFiles(processedEvents);
    const content = buildToolContinuationDisplayText(this.buildDisplayTextSummaries(processedEvents));

    return new AgentInputUserMessage(
      content,
      SenderType.TOOL,
      contextFiles.length > 0 ? contextFiles : null,
      {
        turn_id: normalizedTurnId,
        tool_result_count: processedEvents.length
      }
    );
  }

  private buildDisplayTextSummaries(processedEvents: ToolResultEvent[]): CompletedToolContinuationSummary[] {
    return processedEvents.map((event) => ({
      toolName: event.toolName,
      error: event.error ?? null
    }));
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
