import {
  AgentUserInputMessageProcessorDefinition,
  LLMResponseProcessorDefinition,
  ToolExecutionResultProcessorDefinition,
  ToolInvocationPreprocessorDefinition,
  type BaseAgentUserInputMessageProcessor,
  type BaseLLMResponseProcessor,
  type BaseToolExecutionResultProcessor,
  type BaseToolInvocationPreprocessor,
  defaultSystemPromptProcessorRegistry,
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  registerSystemPromptProcessors,
} from "autobyteus-ts";
import { ExternalChannelTurnReceiptBindingProcessor } from "../agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.js";
import { TokenUsagePersistenceProcessor } from "../agent-customization/processors/persistence/token-usage-persistence-processor.js";
import { UserInputContextBuildingProcessor } from "../agent-customization/processors/prompt/user-input-context-building-processor.js";
import { WorkspacePathSanitizationProcessor } from "../agent-customization/processors/security-processor/workspace-path-sanitization-processor.js";
import { MediaToolResultUrlTransformerProcessor } from "../agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.js";
import { AgentArtifactPersistenceProcessor } from "../agent-customization/processors/tool-result/agent-artifact-persistence-processor.js";
import { MediaInputPathNormalizationPreprocessor } from "../agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.js";
import { MediaUrlTransformerProcessor } from "../agent-customization/processors/response-customization/media-url-transformer-processor.js";
import { ExternalChannelAssistantReplyProcessor } from "../agent-customization/processors/response-customization/external-channel-assistant-reply-processor.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

type InputProcessorClass = typeof BaseAgentUserInputMessageProcessor &
  (new () => BaseAgentUserInputMessageProcessor);
type LlmResponseProcessorClass = typeof BaseLLMResponseProcessor & (new () => BaseLLMResponseProcessor);
type ToolResultProcessorClass = typeof BaseToolExecutionResultProcessor &
  (new () => BaseToolExecutionResultProcessor);
type ToolInvocationPreprocessorClass = typeof BaseToolInvocationPreprocessor &
  (new () => BaseToolInvocationPreprocessor);

function registerInputProcessor(processorClass: InputProcessorClass): void {
  const name = processorClass.getName();
  if (defaultInputProcessorRegistry.contains(name)) {
    return;
  }
  defaultInputProcessorRegistry.registerProcessor(
    new AgentUserInputMessageProcessorDefinition(name, processorClass),
  );
  logger.info(`Registered input processor '${name}'.`);
}

function registerLlmResponseProcessor(processorClass: LlmResponseProcessorClass): void {
  const name = processorClass.getName();
  if (defaultLlmResponseProcessorRegistry.contains(name)) {
    return;
  }
  defaultLlmResponseProcessorRegistry.registerProcessor(
    new LLMResponseProcessorDefinition(name, processorClass),
  );
  logger.info(`Registered LLM response processor '${name}'.`);
}

function registerToolResultProcessor(processorClass: ToolResultProcessorClass): void {
  const name = processorClass.getName();
  if (defaultToolExecutionResultProcessorRegistry.contains(name)) {
    return;
  }
  defaultToolExecutionResultProcessorRegistry.registerProcessor(
    new ToolExecutionResultProcessorDefinition(name, processorClass),
  );
  logger.info(`Registered tool result processor '${name}'.`);
}

function registerToolInvocationPreprocessor(processorClass: ToolInvocationPreprocessorClass): void {
  const name = processorClass.getName();
  if (defaultToolInvocationPreprocessorRegistry.contains(name)) {
    return;
  }
  defaultToolInvocationPreprocessorRegistry.registerPreprocessor(
    new ToolInvocationPreprocessorDefinition(name, processorClass),
  );
  logger.info(`Registered tool invocation preprocessor '${name}'.`);
}

function ensureSystemPromptProcessorsRegistered(): void {
  const requiredNames = ["ToolManifestInjector", "AvailableSkillsProcessor"];
  const missing = requiredNames.filter((name) => !defaultSystemPromptProcessorRegistry.contains(name));
  if (missing.length === 0) {
    logger.info("System prompt processors already registered.");
    return;
  }
  registerSystemPromptProcessors();
  logger.info(`Registered system prompt processors: ${requiredNames.join(", ")}`);
}

export function loadAgentCustomizations(): void {
  logger.info("Registering agent customization processors...");

  ensureSystemPromptProcessorsRegistered();

  registerInputProcessor(WorkspacePathSanitizationProcessor);
  registerInputProcessor(UserInputContextBuildingProcessor);
  registerInputProcessor(ExternalChannelTurnReceiptBindingProcessor);

  registerLlmResponseProcessor(TokenUsagePersistenceProcessor);
  registerLlmResponseProcessor(MediaUrlTransformerProcessor);
  registerLlmResponseProcessor(ExternalChannelAssistantReplyProcessor);

  registerToolInvocationPreprocessor(MediaInputPathNormalizationPreprocessor);
  registerToolResultProcessor(MediaToolResultUrlTransformerProcessor);
  registerToolResultProcessor(AgentArtifactPersistenceProcessor);

  logger.info("Agent customization processor registration complete.");
}
