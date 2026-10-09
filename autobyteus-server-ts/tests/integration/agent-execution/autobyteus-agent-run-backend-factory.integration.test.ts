import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import type { AutoByteusAgentRunBackend } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";
import { registerTools } from "autobyteus-ts/tools/register-tools.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

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
  const toolRegistrySnapshot = defaultToolRegistry.snapshot();
  let memoryDir = "";
  let workspaceDir = "";
  let previousMemoryDir: string | undefined;
  let agentFactory: AgentFactory;
  let backendFactory: AutoByteusAgentRunBackendFactory;
  let persistedAgentDefinition: AgentDefinition;
  let compactionLlmFactory: ReturnType<typeof vi.fn>;

  const createPreparedConfig = (runId: string): AgentRunConfig =>
    new AgentRunConfig({
      agentDefinitionId: "def-autobyteus-backend",
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      memoryDir: path.join(memoryDir, "agents", runId),
    });

  beforeEach(async () => {
    defaultToolRegistry.clear();
    registerTools();
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

    compactionLlmFactory = vi.fn(async () => new DummyLLM(model, new LLMConfig()));
    backendFactory = new AutoByteusAgentRunBackendFactory({
      agentFactory: agentFactory as any,
      agentDefinitionService: {
        getAgentDefinitionById: async () => persistedAgentDefinition,
      } as any,
      createLLM: async () => new DummyLLM(model, new LLMConfig({ systemMessage: "test" })),
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
        hasEffectiveSkills: () => false,
      } as any,
      compactionLlmFactory,
    });
    persistedAgentDefinition = new AgentDefinition({
      id: "def-autobyteus-backend",
      name: "AutoByteusBackendAgent",
      role: "Tester",
      description: "real backend integration test",
      instructions: "Respond briefly.",
      toolNames: [],
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
    defaultToolRegistry.restore(toolRegistrySnapshot);
  });

  // The factory's public contract: beginPreparation owns acquired resources until the backend is returned.
  const prepareNewBackend = (config: AgentRunConfig, runId: string) =>
    backendFactory.beginPreparation({ kind: "new", runId, config }).prepare() as Promise<AutoByteusAgentRunBackend>;
  const prepareRestoredBackend = (context: AgentRunContext<null>) =>
    backendFactory.beginPreparation({ kind: "restore", context }).prepare() as Promise<AutoByteusAgentRunBackend>;

  it("creates a live backend that can process a turn and terminate cleanly", async () => {
    const runId = "autobyteus_backend_agent_11111111111111111111111111111111";
    const backend = await prepareNewBackend(
      createPreparedConfig(runId),
      runId,
    );

    expect(backend.isActive()).toBe(true);
    expect(backend.getContext().config.agentDefinitionId).toBe("def-autobyteus-backend");
    expect(agentFactory.getAgent(runId)?.context.config.tools.map((tool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
    expect(persistedAgentDefinition.toolNames).toEqual([]);
    expect(agentFactory.getAgent(runId)?.context.state.memoryManager
      ?.getAutomaticCompactionConfiguration()).toMatchObject({
        kind: "enabled",
        policy: expect.any(Object),
        createCompressionStrategy: expect.any(Function),
      });
    expect(compactionLlmFactory).not.toHaveBeenCalled();

    const unsubscribe = backend.subscribeToSourceEventBatches(async () => undefined);
    const commandResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello backend integration"),
    });
    expect(commandResult.forwarded).toBe(true);

    await waitFor(() => backend.getLifecycleSnapshot().phase === "idle");

    const terminateResult = await backend.terminate();
    unsubscribe();
    expect(terminateResult.accepted).toBe(true);
    expect(backend.isActive()).toBe(false);
    expect(agentFactory.getAgent(backend.runId)).toBeUndefined();
  });

  it("respects a preferred run id and provisions the standalone memory directory explicitly", async () => {
    const preferredRunId = "preferred_autobyteus_run_4242";
    const backend = await prepareNewBackend(
      createPreparedConfig(preferredRunId),
      preferredRunId,
    );

    expect(backend.runId).toBe(preferredRunId);
    expect(backend.getContext().config.memoryDir).toBe(
      path.join(memoryDir, "agents", preferredRunId),
    );
    await expect(
      fs.access(path.join(memoryDir, "agents", preferredRunId)),
    ).resolves.toBeUndefined();

    const unsubscribe = backend.subscribeToSourceEventBatches(async () => undefined);
    const commandResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello explicit memory"),
    });
    expect(commandResult.forwarded).toBe(true);
    await waitFor(() => backend.getLifecycleSnapshot().phase === "idle");

    const rawTracesPath = path.join(memoryDir, "agents", preferredRunId, "raw_traces_active.jsonl");
    await waitFor(async () => {
      try {
        const raw = await fs.readFile(rawTracesPath, "utf-8");
        return raw.includes("hello explicit memory");
      } catch {
        return false;
      }
    });
    unsubscribe();
  });

  it("restores a terminated run with the same run id", async () => {
    const runId = "autobyteus_backend_agent_22222222222222222222222222222222";
    const created = await prepareNewBackend(
      createPreparedConfig(runId),
      runId,
    );

    const unsubscribeCreated = created.subscribeToSourceEventBatches(async () => undefined);
    const firstResult = await created.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("first restoreable turn"),
    });
    expect(firstResult.forwarded).toBe(true);
    await waitFor(() => created.getLifecycleSnapshot().phase === "idle");

    const terminateResult = await created.terminate();
    unsubscribeCreated();
    expect(terminateResult.accepted).toBe(true);

    const restored = await prepareRestoredBackend(
      new AgentRunContext({
        runId,
        config: new AgentRunConfig({
          agentDefinitionId: "def-autobyteus-backend",
          llmModelIdentifier: "dummy-model",
          autoExecuteTools: false,
          memoryDir: path.join(memoryDir, "agents", runId),
        }),
        runtimeContext: null,
      }),
    );

    expect(restored.runId).toBe(runId);
    expect(restored.isActive()).toBe(true);
    expect(agentFactory.getAgent(runId)?.context.config.tools.map((tool) => tool.definition?.name)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
    expect(persistedAgentDefinition.toolNames).toEqual([]);
    expect(agentFactory.getAgent(runId)?.context.state.memoryManager
      ?.getAutomaticCompactionConfiguration()).toMatchObject({
        kind: "enabled",
        policy: expect.any(Object),
        createCompressionStrategy: expect.any(Function),
      });
    expect(compactionLlmFactory).not.toHaveBeenCalled();

    const unsubscribeRestored = restored.subscribeToSourceEventBatches(async () => undefined);
    const secondResult = await restored.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("second restoreable turn"),
    });
    expect(secondResult.forwarded).toBe(true);
    await waitFor(() => restored.getLifecycleSnapshot().phase === "idle");
    unsubscribeRestored();
  });

  it("rejects fresh create when the standalone run is not fully prepared", async () => {
    await expect(
      prepareNewBackend(
        new AgentRunConfig({
          agentDefinitionId: "def-autobyteus-backend",
          llmModelIdentifier: "dummy-model",
          autoExecuteTools: false,
        }),
        "",
      ),
    ).rejects.toThrow("requires agentRunId");
  });
});
