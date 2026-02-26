import fs from "node:fs";
import path from "node:path";
import {
  BaseAgentUserInputMessageProcessor,
  type AgentContext,
  type AgentInputUserMessage,
} from "autobyteus-ts";
import type { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import type { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";
import { PromptContextBuilder } from "./prompt-context-builder.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class UserInputContextBuildingProcessor extends BaseAgentUserInputMessageProcessor {
  constructor() {
    super();
    logger.debug("UserInputContextBuildingProcessor initialized.");
  }

  static override getName(): string {
    return "UserInputContextBuildingProcessor";
  }

  static override getOrder(): number {
    return 900;
  }

  static override isMandatory(): boolean {
    return true;
  }

  private isUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return Boolean(parsed.protocol && parsed.hostname);
    } catch {
      return false;
    }
  }

  private isAutobyteusProvider(provider?: unknown): boolean {
    if (provider === null || provider === undefined) {
      return false;
    }
    const providerValue =
      typeof provider === "object" && provider && "value" in provider
        ? String((provider as { value: unknown }).value)
        : String(provider);
    return providerValue.toUpperCase() === LLMProvider.AUTOBYTEUS;
  }

  private async resolveLlmProvider(context: AgentContext): Promise<unknown | null> {
    const llmModel = context?.llmInstance?.model as
      | { modelIdentifier?: string; provider?: unknown }
      | undefined;
    if (!llmModel) {
      return null;
    }

    const modelIdentifier = llmModel.modelIdentifier;
    if (typeof modelIdentifier === "string" && modelIdentifier.trim().length > 0) {
      try {
        const provider = await LLMFactory.getProvider(modelIdentifier);
        if (provider) {
          return provider;
        }
      } catch (error) {
        logger.debug(
          `Failed to resolve provider from LLMFactory for model '${modelIdentifier}': ${String(error)}`,
        );
      }
    }

    return llmModel.provider ?? null;
  }

  private async modelProviderIsAutobyteus(context: AgentContext): Promise<boolean> {
    const provider = await this.resolveLlmProvider(context);
    return this.isAutobyteusProvider(provider);
  }

  private async unifyAndTransformPaths(
    message: AgentInputUserMessage,
    context: AgentContext,
  ): Promise<ContextFile[]> {
    if (!message.contextFiles || message.contextFiles.length === 0) {
      return [];
    }

    const agentId = context.agentId;
    const processed: ContextFile[] = [];

    for (const contextFile of message.contextFiles) {
      if (typeof contextFile.uri !== "string" || this.isUrl(contextFile.uri)) {
        processed.push(contextFile);
        continue;
      }

      let absolutePath: string | null = null;
      try {
        if (path.isAbsolute(contextFile.uri)) {
          if (fs.existsSync(contextFile.uri) && fs.statSync(contextFile.uri).isFile()) {
            absolutePath = path.resolve(contextFile.uri);
          } else {
            logger.warn(
              `Agent '${agentId}': Absolute file path '${contextFile.uri}' does not exist or is not a file. Skipping.`,
            );
          }
        } else if (context.workspace instanceof FileSystemWorkspace) {
          const resolvedPath = context.workspace.getAbsolutePath(contextFile.uri);
          if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
            absolutePath = resolvedPath;
          } else {
            logger.warn(
              `Agent '${agentId}': Relative path '${contextFile.uri}' not found in workspace. Skipping.`,
            );
          }
        } else {
          logger.warn(
            `Agent '${agentId}': Cannot resolve relative path '${contextFile.uri}' without a FileSystemWorkspace. Skipping.`,
          );
        }
      } catch (error) {
        logger.warn(
          `Agent '${agentId}': Security error resolving path '${contextFile.uri}': ${String(
            error,
          )}. Skipping.`,
        );
        continue;
      }

      if (!absolutePath) {
        continue;
      }

      contextFile.uri = absolutePath;
      processed.push(contextFile);
    }

    return processed;
  }

  private formatUserMessageContent(
    rawRequirement: string,
    contextString: string | null,
    senderType: SenderType,
  ): string {
    const headerMap: Record<string, string> = {
      [SenderType.USER]: "**[User Requirement]**",
      [SenderType.TOOL]: "**[Tool Execution Result]**",
      [SenderType.AGENT]: "**[Message From Agent]**",
      [SenderType.SYSTEM]: "**[System Notification]**",
    };
    const mainHeader = headerMap[senderType] ?? "**[Input]**";

    const parts: string[] = [];
    if (contextString) {
      parts.push(`**[Context]**\n${contextString}`);
    }

    parts.push(`${mainHeader}\n${rawRequirement}`);
    return parts.join("\n\n");
  }

  async process(
    message: AgentInputUserMessage,
    context: AgentContext,
    _triggeringEvent: UserMessageReceivedEvent,
  ): Promise<AgentInputUserMessage> {
    const agentId = context.agentId;
    const customData = context.customData ?? {};
    const isFirstUserTurn =
      typeof customData.is_first_user_turn === "boolean" ? customData.is_first_user_turn : true;

    const rawRequirement = message.content;

    const processedContextFiles = await this.unifyAndTransformPaths(message, context);
    message.contextFiles = processedContextFiles;

    let contextString: string | null = null;
    const readableTypes = ContextFileType.getReadableTextTypes();
    const hasReadableContext = (message.contextFiles ?? []).some((cf) =>
      readableTypes.includes(cf.fileType),
    );
    if (hasReadableContext) {
      const builder = new PromptContextBuilder(message, context.workspace ?? null);
      contextString = builder.buildContextString();
    }

    const formattedMessage = this.formatUserMessageContent(
      rawRequirement,
      contextString,
      message.senderType,
    );

    let finalContent = formattedMessage;
    const isAutobyteusModel = await this.modelProviderIsAutobyteus(context);
    const llmModelName = context.llmInstance?.model?.name ?? "";

    if (isFirstUserTurn && isAutobyteusModel) {
      logger.debug(
        `Agent '${agentId}': First turn for AUTOBYTEUS model '${llmModelName}'. Prepending system prompt.`,
      );
      const systemPrompt =
        context.llmInstance?.systemMessage ?? context.config?.systemPrompt ?? "";
      if (systemPrompt) {
        finalContent = `${systemPrompt}\n\n${formattedMessage}`;
      } else {
        logger.warn(
          `Agent '${agentId}': AUTOBYTEUS model's first turn, but system prompt is empty. Not prepending.`,
        );
      }
    } else {
      logger.debug(
        `Agent '${agentId}': Standard prompt processing. isFirstUserTurn=${isFirstUserTurn}, isAutobyteusModel=${isAutobyteusModel}.`,
      );
    }

    if (isFirstUserTurn && context.customData) {
      context.customData.is_first_user_turn = false;
      logger.debug(`Agent '${agentId}': First turn processed, 'is_first_user_turn' set to false.`);
    }

    message.content = finalContent;
    logger.info(
      `Agent '${agentId}': ${this.constructor.name} completed. Final content length: ${message.content.length}`,
    );
    return message;
  }
}
