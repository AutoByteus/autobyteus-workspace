import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerReadFileTool } from "autobyteus-ts/tools/file/read-file.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { registerTaskDelegationTools } from "../../../src/agent-tools/task-delegation/register-task-delegation-tools.js";
import { AutoByteusAgentConfigBuilder } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

class DummyLLM extends BaseLLM {
  constructor() {
    super(
      new LLMModel({
        name: "dummy",
        value: "dummy",
        canonicalName: "dummy",
        provider: LLMProvider.OPENAI,
      }),
      new LLMConfig(),
    );
  }

  protected async _sendMessagesToLLM(_messages: unknown[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(
    _messages: unknown[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const emptyProcessorRegistry = {
  getOrderedProcessorOptions: () => [],
  getProcessor: () => undefined,
  getPreprocessor: () => undefined,
};

describe("AutoByteusAgentConfigBuilder", () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    registerTaskDelegationTools();
    registerReadFileTool();
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
  });

  it("gates server-owned task delegation tools for native AutoByteus pure-team agents while settlement is unsupported", async () => {
    const agentDefinition = new AgentDefinition({
      id: "agent-def-1",
      name: "NativeWorker",
      role: "worker",
      description: "Native AutoByteus worker.",
      instructions: "Do work.",
      toolNames: ["delegate_tasks", "update_task_status", "read_file"],
    });
    const builder = new AutoByteusAgentConfigBuilder({
      agentDefinitionService: {
        getFreshAgentDefinitionById: async () => agentDefinition,
      } as any,
      llmFactory: {
        createLLM: async () => new DummyLLM(),
      } as any,
      workspaceManager: {
        getWorkspaceById: () => undefined,
        ensureWorkspaceByRootPath: async () => undefined,
      } as any,
      skillService: {
        getSkill: () => undefined,
      } as any,
      registries: {
        input: emptyProcessorRegistry,
        llmResponse: emptyProcessorRegistry,
        systemPrompt: emptyProcessorRegistry,
        toolExecutionResult: emptyProcessorRegistry,
        toolInvocationPreprocessor: emptyProcessorRegistry,
        lifecycle: emptyProcessorRegistry,
      } as any,
    });

    const config = await builder.build("NativeWorker", "agent-def-1", {
      memberKind: "agent",
      memberName: "NativeWorker",
      memberPath: ["NativeWorker"],
      memberRouteKey: "NativeWorker",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "dummy",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    expect(config.tools.map((tool) => tool.definition?.name)).toEqual(["read_file"]);
  });
});
