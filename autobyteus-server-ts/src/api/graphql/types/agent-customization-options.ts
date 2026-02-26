import { Query, Resolver } from "type-graphql";
import {
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultSystemPromptProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  defaultLifecycleEventProcessorRegistry,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const toOptionalNames = (options: Array<{ name: string; isMandatory: boolean }>): string[] =>
  options.filter((opt) => !opt.isMandatory).map((opt) => opt.name);

@Resolver()
export class AgentCustomizationOptionsResolver {
  @Query(() => [String])
  availableToolNames(): string[] {
    try {
      return defaultToolRegistry.listToolNames();
    } catch (error) {
      logger.error(`Error fetching available tool names: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalInputProcessorNames(): string[] {
    try {
      const options = defaultInputProcessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available input processors: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalLlmResponseProcessorNames(): string[] {
    try {
      const options = defaultLlmResponseProcessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available LLM response processors: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalSystemPromptProcessorNames(): string[] {
    try {
      const options = defaultSystemPromptProcessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available system prompt processors: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalToolExecutionResultProcessorNames(): string[] {
    try {
      const options = defaultToolExecutionResultProcessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available tool execution result processors: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalToolInvocationPreprocessorNames(): string[] {
    try {
      const options = defaultToolInvocationPreprocessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available tool invocation preprocessors: ${String(error)}`);
      return [];
    }
  }

  @Query(() => [String])
  availableOptionalLifecycleProcessorNames(): string[] {
    try {
      const options = defaultLifecycleEventProcessorRegistry.getOrderedProcessorOptions();
      return toOptionalNames(options);
    } catch (error) {
      logger.error(`Error fetching available lifecycle processors: ${String(error)}`);
      return [];
    }
  }
}
