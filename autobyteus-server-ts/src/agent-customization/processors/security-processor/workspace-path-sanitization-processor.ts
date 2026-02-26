import path from "node:path";
import {
  BaseAgentUserInputMessageProcessor,
  type AgentContext,
  type AgentInputUserMessage,
} from "autobyteus-ts";
import type { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class WorkspacePathSanitizationProcessor extends BaseAgentUserInputMessageProcessor {
  static override getName(): string {
    return "WorkspacePathSanitizationProcessor";
  }

  static override getOrder(): number {
    return 200;
  }

  static override isMandatory(): boolean {
    return false;
  }

  async process(
    message: AgentInputUserMessage,
    context: AgentContext,
    _triggeringEvent: UserMessageReceivedEvent,
  ): Promise<AgentInputUserMessage> {
    const workspace = context.workspace;
    const agentRunId = context.agentId;

    if (!(workspace instanceof FileSystemWorkspace) || !workspace.rootPath) {
      logger.debug(
        `Agent run '${agentRunId}': Workspace is not a FileSystemWorkspace or has no rootPath. Skipping path sanitization.`,
      );
      return message;
    }

    const originalContent = message.content;
    const rootPath = path.normalize(workspace.rootPath);

    const escapedRoot = escapeRegExp(rootPath);
    const prefixPattern = new RegExp(`${escapedRoot}[\\\\/]`, "g");
    let sanitizedContent = originalContent.replace(prefixPattern, "");

    const standalonePattern = new RegExp(`(?<!\\S)${escapedRoot}(?!\\S)`, "g");
    sanitizedContent = sanitizedContent.replace(standalonePattern, "");

    sanitizedContent = sanitizedContent.replace(/\\s{2,}/g, " ").trim();

    if (originalContent !== sanitizedContent) {
      logger.info(
        `Agent run '${agentRunId}': Sanitized user message by removing workspace path '${rootPath}'.`,
      );
      message.content = sanitizedContent;
    } else {
      logger.debug(
        `Agent run '${agentRunId}': No occurrences of workspace path '${rootPath}' found in message. No sanitization needed.`,
      );
    }

    return message;
  }
}
