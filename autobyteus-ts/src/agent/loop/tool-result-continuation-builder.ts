import { ToolResultEvent } from '../events/agent-events.js';
import { ContextFile } from '../message/context-file.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import { formatToCleanString } from '../../utils/llm-output-formatter.js';

export class ToolResultContinuationBuilder {
  build(processedEvents: ToolResultEvent[]): AgentInputUserMessage {
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
