import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentFactory, AgentInputUserMessage } from "autobyteus-ts";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { Message } from "autobyteus-ts/llm/utils/messages.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 8000,
  intervalMs = 50,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms.`);
};

describe("AutoByteusAgentRunBackendFactory integration", () => {
  let memoryDir = "";
  let workspaceDir = "";
  let previousMemoryDir: string | undefined;
  let agentFactory: AgentFactory;
  let backendFactory: AutoByteusAgentRunBackendFactory;

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-backend-memory-"));
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-backend-workspace-"));
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;

    const model = new LLMModel({
      name: "dummy-autobyteus-backend",
      value: "dummy-autobyteus-backend",
      canonicalName: "dummy-autobyteus-backend",
      provider: LLMProvider.OPENAI,
    });

    agentFactory = new AgentFactory();
    const activeIds = agentFactory.listActiveAgentIds();
    await Promise.all(activeIds.map((id) => agentFactory.removeAgent(id).catch(() => false)));

    backendFactory = new AutoByteusAgentRunBackendFactory({
      agentFactory: agentFactory as any,
      agentDefinitionService: {
        getAgentDefinitionById: async () =>
          new AgentDefinition({
            id: "def-autobyteus-backend",
            name: "AutoByteusBackendAgent",
            role: "Tester",
            description: "real backend integration test",
            instructions: "Respond briefly.",
          }),
      } as any,
      llmFactory: {
        createLLM: async () => new DummyLLM(model, new LLMConfig({ systemMessage: "test" })),
      } as any,
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "temp_ws_backend_integration",
          getName: () => "Temp Workspace",
          getBasePath: () => workspaceDir,
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });
  });

  afterEach(async () => {
    const activeIds = agentFactory.listActiveAgentIds();
    await Promise.all(activeIds.map((id) => agentFactory.removeAgent(id).catch(() => false)));
    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.rm(workspaceDir, { recursive: true, force: true });
    if (previousMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    }
  });

  it("creates a live backend that can process a turn and terminate cleanly", async () => {
    const backend = await backendFactory.createBackend(
      new AgentRunConfig({
        agentDefinitionId: "def-autobyteus-backend",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
      }),
    );

    expect(backend.isActive()).toBe(true);
    expect(backend.getContext().config.agentDefinitionId).toBe("def-autobyteus-backend");

    const commandResult = await backend.postUserMessage(
      new AgentInputUserMessage("hello backend integration"),
    );
    expect(commandResult.accepted).toBe(true);

    await waitFor(() => (backend.getStatus() ?? "").toLowerCase() === "idle");

    const terminateResult = await backend.terminate();
    expect(terminateResult.accepted).toBe(true);
    expect(backend.isActive()).toBe(false);
    expect(agentFactory.getAgent(backend.runId)).toBeUndefined();
  });

  it("restores a terminated run with the same run id", async () => {
    const created = await backendFactory.createBackend(
      new AgentRunConfig({
        agentDefinitionId: "def-autobyteus-backend",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
      }),
    );

    const runId = created.runId;
    const firstResult = await created.postUserMessage(
      new AgentInputUserMessage("first restoreable turn"),
    );
    expect(firstResult.accepted).toBe(true);
    await waitFor(() => (created.getStatus() ?? "").toLowerCase() === "idle");

    const terminateResult = await created.terminate();
    expect(terminateResult.accepted).toBe(true);

    const restored = await backendFactory.restoreBackend(
      new AgentRunContext({
        runId,
        config: new AgentRunConfig({
          agentDefinitionId: "def-autobyteus-backend",
          llmModelIdentifier: "dummy-model",
          autoExecuteTools: false,
        }),
        runtimeContext: null,
      }),
    );

    expect(restored.runId).toBe(runId);
    expect(restored.isActive()).toBe(true);

    const secondResult = await restored.postUserMessage(
      new AgentInputUserMessage("second restoreable turn"),
    );
    expect(secondResult.accepted).toBe(true);
    await waitFor(() => (restored.getStatus() ?? "").toLowerCase() === "idle");
  });
});
