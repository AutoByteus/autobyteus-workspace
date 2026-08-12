import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  type AgentUserInputMessageProcessorDefinition,
  type LLMResponseProcessorDefinition,
  type ToolInvocationPreprocessorDefinition,
} from "autobyteus-ts";
import { loadAgentCustomizations } from "../../../src/startup/agent-customization-loader.js";
import { WorkspacePathSanitizationProcessor } from "../../../src/agent-customization/processors/security-processor/workspace-path-sanitization-processor.js";
import { UserInputContextBuildingProcessor } from "../../../src/agent-customization/processors/prompt/user-input-context-building-processor.js";
import { MediaUrlTransformerProcessor } from "../../../src/agent-customization/processors/response-customization/media-url-transformer-processor.js";
import { MediaInputPathNormalizationPreprocessor } from "../../../src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.js";

describe("loadAgentCustomizations", () => {
  let inputSnapshot: Record<string, AgentUserInputMessageProcessorDefinition>;
  let llmResponseSnapshot: Record<string, LLMResponseProcessorDefinition>;
  let toolInvocationSnapshot: Record<string, ToolInvocationPreprocessorDefinition>;

  beforeEach(() => {
    inputSnapshot = defaultInputProcessorRegistry.getAllDefinitions();
    llmResponseSnapshot = defaultLlmResponseProcessorRegistry.getAllDefinitions();
    toolInvocationSnapshot = defaultToolInvocationPreprocessorRegistry.getAllDefinitions();

    defaultInputProcessorRegistry.clear();
    defaultLlmResponseProcessorRegistry.clear();
    defaultToolInvocationPreprocessorRegistry.clear();
  });

  afterEach(() => {
    defaultInputProcessorRegistry.clear();
    Object.values(inputSnapshot).forEach((definition) => {
      defaultInputProcessorRegistry.registerProcessor(definition);
    });

    defaultLlmResponseProcessorRegistry.clear();
    Object.values(llmResponseSnapshot).forEach((definition) => {
      defaultLlmResponseProcessorRegistry.registerProcessor(definition);
    });

    defaultToolInvocationPreprocessorRegistry.clear();
    Object.values(toolInvocationSnapshot).forEach((definition) => {
      defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);
    });
  });

  it("registers customization processors in all registries", () => {
    loadAgentCustomizations();

    expect(defaultInputProcessorRegistry.contains(WorkspacePathSanitizationProcessor.getName())).toBe(true);
    expect(defaultInputProcessorRegistry.contains(UserInputContextBuildingProcessor.getName())).toBe(true);

    expect(defaultLlmResponseProcessorRegistry.contains("TokenUsagePersistenceProcessor")).toBe(false);
    expect(defaultLlmResponseProcessorRegistry.contains(MediaUrlTransformerProcessor.getName())).toBe(true);

    expect(
      defaultToolInvocationPreprocessorRegistry.contains(MediaInputPathNormalizationPreprocessor.getName()),
    ).toBe(true);
  });
});
