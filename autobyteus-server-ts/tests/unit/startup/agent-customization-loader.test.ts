import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultSystemPromptProcessorRegistry,
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultLifecycleEventProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  type SystemPromptProcessorDefinition,
  type AgentUserInputMessageProcessorDefinition,
  type LLMResponseProcessorDefinition,
  type LifecycleEventProcessorDefinition,
  type ToolExecutionResultProcessorDefinition,
  type ToolInvocationPreprocessorDefinition,
} from "autobyteus-ts";
import { loadAgentCustomizations } from "../../../src/startup/agent-customization-loader.js";
import { WorkspacePathSanitizationProcessor } from "../../../src/agent-customization/processors/security-processor/workspace-path-sanitization-processor.js";
import { UserInputContextBuildingProcessor } from "../../../src/agent-customization/processors/prompt/user-input-context-building-processor.js";
import { ExternalChannelTurnReceiptBindingProcessor } from "../../../src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.js";
import { TokenUsagePersistenceProcessor } from "../../../src/agent-customization/processors/persistence/token-usage-persistence-processor.js";
import { MediaUrlTransformerProcessor } from "../../../src/agent-customization/processors/response-customization/media-url-transformer-processor.js";
import { ExternalChannelAssistantReplyProcessor } from "../../../src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.js";
import { MediaInputPathNormalizationPreprocessor } from "../../../src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.js";
import { MediaToolResultUrlTransformerProcessor } from "../../../src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.js";
import { AgentArtifactPersistenceProcessor } from "../../../src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.js";

describe("loadAgentCustomizations", () => {
  let systemPromptSnapshot: Record<string, SystemPromptProcessorDefinition>;
  let inputSnapshot: Record<string, AgentUserInputMessageProcessorDefinition>;
  let llmResponseSnapshot: Record<string, LLMResponseProcessorDefinition>;
  let lifecycleSnapshot: Record<string, LifecycleEventProcessorDefinition>;
  let toolResultSnapshot: Record<string, ToolExecutionResultProcessorDefinition>;
  let toolInvocationSnapshot: Record<string, ToolInvocationPreprocessorDefinition>;

  beforeEach(() => {
    systemPromptSnapshot = defaultSystemPromptProcessorRegistry.getAllDefinitions();
    inputSnapshot = defaultInputProcessorRegistry.getAllDefinitions();
    llmResponseSnapshot = defaultLlmResponseProcessorRegistry.getAllDefinitions();
    lifecycleSnapshot = defaultLifecycleEventProcessorRegistry.getAllDefinitions();
    toolResultSnapshot = defaultToolExecutionResultProcessorRegistry.getAllDefinitions();
    toolInvocationSnapshot = defaultToolInvocationPreprocessorRegistry.getAllDefinitions();

    defaultSystemPromptProcessorRegistry.clear();
    defaultInputProcessorRegistry.clear();
    defaultLlmResponseProcessorRegistry.clear();
    defaultLifecycleEventProcessorRegistry.clear();
    defaultToolExecutionResultProcessorRegistry.clear();
    defaultToolInvocationPreprocessorRegistry.clear();
  });

  afterEach(() => {
    defaultSystemPromptProcessorRegistry.clear();
    Object.values(systemPromptSnapshot).forEach((definition) => {
      defaultSystemPromptProcessorRegistry.registerProcessor(definition);
    });

    defaultInputProcessorRegistry.clear();
    Object.values(inputSnapshot).forEach((definition) => {
      defaultInputProcessorRegistry.registerProcessor(definition);
    });

    defaultLlmResponseProcessorRegistry.clear();
    Object.values(llmResponseSnapshot).forEach((definition) => {
      defaultLlmResponseProcessorRegistry.registerProcessor(definition);
    });

    defaultLifecycleEventProcessorRegistry.clear();
    Object.values(lifecycleSnapshot).forEach((definition) => {
      defaultLifecycleEventProcessorRegistry.registerProcessor(definition);
    });

    defaultToolExecutionResultProcessorRegistry.clear();
    Object.values(toolResultSnapshot).forEach((definition) => {
      defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);
    });

    defaultToolInvocationPreprocessorRegistry.clear();
    Object.values(toolInvocationSnapshot).forEach((definition) => {
      defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);
    });
  });

  it("registers core system prompt processors", () => {
    loadAgentCustomizations();

    expect(defaultSystemPromptProcessorRegistry.contains("ToolManifestInjector")).toBe(true);
    expect(defaultSystemPromptProcessorRegistry.contains("AvailableSkillsProcessor")).toBe(true);
  });

  it("registers customization processors in all registries", () => {
    loadAgentCustomizations();

    expect(Object.keys(defaultLifecycleEventProcessorRegistry.getAllDefinitions())).toHaveLength(0);

    expect(defaultInputProcessorRegistry.contains(WorkspacePathSanitizationProcessor.getName())).toBe(true);
    expect(defaultInputProcessorRegistry.contains(UserInputContextBuildingProcessor.getName())).toBe(true);
    expect(defaultInputProcessorRegistry.contains(ExternalChannelTurnReceiptBindingProcessor.getName())).toBe(true);

    expect(defaultLlmResponseProcessorRegistry.contains(TokenUsagePersistenceProcessor.getName())).toBe(true);
    expect(defaultLlmResponseProcessorRegistry.contains(MediaUrlTransformerProcessor.getName())).toBe(true);
    expect(defaultLlmResponseProcessorRegistry.contains(ExternalChannelAssistantReplyProcessor.getName())).toBe(true);

    expect(
      defaultToolInvocationPreprocessorRegistry.contains(MediaInputPathNormalizationPreprocessor.getName()),
    ).toBe(true);

    expect(
      defaultToolExecutionResultProcessorRegistry.contains(MediaToolResultUrlTransformerProcessor.getName()),
    ).toBe(true);
    expect(
      defaultToolExecutionResultProcessorRegistry.contains(AgentArtifactPersistenceProcessor.getName()),
    ).toBe(true);
  });
});
