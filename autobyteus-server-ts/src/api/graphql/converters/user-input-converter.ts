import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import { AgentUserInput } from "../types/agent-user-input.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class UserInputConverter {
  static toAgentInputUserMessage(graphqlInput: AgentUserInput): AgentInputUserMessage {
    const contextFiles: ContextFile[] = [];

    if (graphqlInput.contextFiles?.length) {
      for (const input of graphqlInput.contextFiles) {
        try {
          const type = Object.values(ContextFileType).includes(input.type)
            ? input.type
            : ContextFileType.UNKNOWN;
          contextFiles.push(new ContextFile(input.path, type));
        } catch (error) {
          logger.error(
            `Failed to process context file input ${JSON.stringify(input)}: ${String(error)}`,
          );
        }
      }
    }

    return new AgentInputUserMessage(
      graphqlInput.content,
      undefined,
      contextFiles.length ? contextFiles : null,
    );
  }
}
