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
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";

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
  let persistedAgentDefinition: AgentDefinition;
  let compactionRunner: { runCompactionTask: ReturnType<typeof vi.fn> };
  let compactionAgentRunnerFactory: ReturnType<typeof vi.fn>;

  const createPreparedConfig = (runId: string): AgentRunConfig =>
    new AgentRunConfig({
      agentDefinitionId: "def-autobyteus-backend",
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      memoryDir: path.join(memoryDir, "agents", runId),
    });

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

    compactionRunner = { runCompactionTask: vi.fn() };
    compactionAgentRunnerFactory = vi.fn(() => compactionRunner);
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
      } as any,
      compactionAgentRunnerFactory,
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
  });

  it("creates a live backend that can process a turn and terminate cleanly", async () => {
    const runId = "autobyteus_backend_agent_11111111111111111111111111111111";
    const backend = await backendFactory.createBackend(
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
        runner: compactionRunner,
      });
    expect(compactionAgentRunnerFactory).toHaveBeenCalledOnce();

    const commandResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("hello backend integration"),
    });
    expect(commandResult.forwarded).toBe(true);

    await waitFor(() => backend.getLifecycleSnapshot().phase === "idle");

    const terminateResult = await backend.terminate();
    expect(terminateResult.accepted).toBe(true);
    expect(backend.isActive()).toBe(false);
    expect(agentFactory.getAgent(backend.runId)).toBeUndefined();
  });

  it("materializes and restores the canonical Memory Compactor as a disabled leaf", async () => {
    persistedAgentDefinition = new AgentDefinition({
      id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      name: "Memory Compactor",
      role: "Compaction specialist",
      description: "Compacts target-agent memory.",
      instructions: "Return the required structured memory object.",
      toolNames: [],
    });
    const runId = "memory_compactor_runtime_tools_empty_11111111";
    compactionAgentRunnerFactory.mockClear();
    const backend = await backendFactory.createBackend(
      new AgentRunConfig({
        agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        memoryDir: path.join(memoryDir, "agents", runId),
      }),
      runId,
    );

    expect(agentFactory.getAgent(runId)?.context.config.tools).toEqual([]);
    expect(persistedAgentDefinition.toolNames).toEqual([]);
    expect(backend.getContext().config.agentDefinitionId)
      .toBe(MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
    expect(agentFactory.getAgent(runId)?.context.state.memoryManager
      ?.getAutomaticCompactionConfiguration()).toEqual({ kind: "disabled" });
    expect(compactionAgentRunnerFactory).not.toHaveBeenCalled();

    const commandResult = await backend.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("persist one compactor task before restore"),
    });
    expect(commandResult.forwarded).toBe(true);
    await waitFor(() => backend.getLifecycleSnapshot().phase === "idle");

    const terminateResult = await backend.terminate();
    expect(terminateResult.accepted).toBe(true);
    expect(agentFactory.getAgent(runId)).toBeUndefined();

    const restored = await backendFactory.restoreBackend(new AgentRunContext({
      runId,
      config: new AgentRunConfig({
        agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        memoryDir: path.join(memoryDir, "agents", runId),
      }),
      runtimeContext: null,
    }));

    expect(restored.runId).toBe(runId);
    expect(agentFactory.getAgent(runId)?.context.config.tools).toEqual([]);
    expect(agentFactory.getAgent(runId)?.context.state.memoryManager
      ?.getAutomaticCompactionConfiguration()).toEqual({ kind: "disabled" });
    expect(compactionAgentRunnerFactory).not.toHaveBeenCalled();
  });

  it("respects a preferred run id and provisions the standalone memory directory explicitly", async () => {
    const preferredRunId = "preferred_autobyteus_run_4242";
    const backend = await backendFactory.createBackend(
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
  });

  it("restores a terminated run with the same run id", async () => {
    const runId = "autobyteus_backend_agent_22222222222222222222222222222222";
    const created = await backendFactory.createBackend(
      createPreparedConfig(runId),
      runId,
    );

    const firstResult = await created.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("first restoreable turn"),
    });
    expect(firstResult.forwarded).toBe(true);
    await waitFor(() => created.getLifecycleSnapshot().phase === "idle");

    const terminateResult = await created.terminate();
    expect(terminateResult.accepted).toBe(true);

    const restored = await backendFactory.restoreBackend(
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
        runner: compactionRunner,
      });
    expect(compactionAgentRunnerFactory).toHaveBeenCalledTimes(2);

    const secondResult = await restored.dispatchUserInput({
      kind: "start_turn",
      message: new AgentInputUserMessage("second restoreable turn"),
    });
    expect(secondResult.forwarded).toBe(true);
    await waitFor(() => restored.getLifecycleSnapshot().phase === "idle");
  });

  it("rejects fresh create when the standalone run is not fully prepared", async () => {
    await expect(
      backendFactory.createBackend(
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
