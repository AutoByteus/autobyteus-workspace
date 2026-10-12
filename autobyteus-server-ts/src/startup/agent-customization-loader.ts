import {
  AgentUserInputMessageProcessorDefinition,
  LLMResponseProcessorDefinition,
  type BaseAgentUserInputMessageProcessor,
  type BaseLLMResponseProcessor,
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
} from "autobyteus-ts";
import { UserInputContextBuildingProcessor } from "../agent-customization/processors/prompt/user-input-context-building-processor.js";
import { WorkspacePathSanitizationProcessor } from "../agent-customization/processors/security-processor/workspace-path-sanitization-processor.js";
import { MediaUrlTransformerProcessor } from "../agent-customization/processors/response-customization/media-url-transformer-processor.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
};

type InputProcessorClass = typeof BaseAgentUserInputMessageProcessor &
  (new () => BaseAgentUserInputMessageProcessor);
type LlmResponseProcessorClass = typeof BaseLLMResponseProcessor & (new () => BaseLLMResponseProcessor);

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

export function loadAgentCustomizations(): void {
  logger.info("Registering agent customization processors...");

  registerInputProcessor(WorkspacePathSanitizationProcessor);
  registerInputProcessor(UserInputContextBuildingProcessor);

  registerLlmResponseProcessor(MediaUrlTransformerProcessor);

  logger.info("Agent customization processor registration complete.");
}
