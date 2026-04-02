import type {
  BaseAgentUserInputMessageProcessor,
  BaseLLMResponseProcessor,
  BaseLifecycleEventProcessor,
  BaseSystemPromptProcessor,
  BaseToolExecutionResultProcessor,
  BaseToolInvocationPreprocessor,
} from "autobyteus-ts";

export type ProcessorOption = { name: string; isMandatory: boolean };

export type ProcessorRegistry<T> = {
  getProcessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

export type PreprocessorRegistry<T> = {
  getPreprocessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

export type TeamProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};
