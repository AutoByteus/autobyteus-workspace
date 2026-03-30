import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentFactory, AgentInputUserMessage } from "autobyteus-ts";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { Message } from "autobyteus-ts/llm/utils/messages.js";

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

describe("AgentRunManager real memory layout integration", () => {
  let memoryDir = "";
  let workspaceDir = "";
  let previousMemoryDir: string | undefined;
  let manager: AgentRunManager;

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-memory-layout-"));
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-workspace-layout-"));
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;

    const model = new LLMModel({
      name: "dummy-real-memory-layout",
      value: "dummy-real-memory-layout",
      canonicalName: "dummy-real-memory-layout",
      provider: LLMProvider.OPENAI,
    });

    const factory = new AgentFactory();
    const activeIds = factory.listActiveAgentIds();
    await Promise.all(activeIds.map((id) => factory.removeAgent(id).catch(() => false)));

    manager = new AgentRunManager({
      agentFactory: factory as any,
      agentDefinitionService: {
        getAgentDefinitionById: async () =>
          new AgentDefinition({
            id: "def-real-memory-layout",
            name: "RealMemoryLayoutAgent",
            role: "Tester",
            description: "real integration for memory layout",
          }),
      } as any,
      llmFactory: {
        createLLM: async () => new DummyLLM(model, new LLMConfig({ systemMessage: "test" })),
      } as any,
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "temp_ws_real_layout",
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
    const activeIds = manager.listActiveRuns();
    await Promise.all(activeIds.map((id) => manager.terminateAgentRun(id).catch(() => false)));
    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.rm(workspaceDir, { recursive: true, force: true });
    if (previousMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    }
  });

  it("persists single-agent traces only under memory/agents/<runId> for create + restore", async () => {
    const runId = await manager.createAgentRun(
      new AgentRunConfig({
      agentDefinitionId: "def-real-memory-layout",
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      }),
    );

    const createdRun = manager.getActiveRun(runId);
    expect(createdRun).toBeTruthy();
    const firstMessageResult = await createdRun?.postUserMessage(
      new AgentInputUserMessage("first real turn"),
    );
    expect(firstMessageResult?.accepted).toBe(true);
    await waitFor(() => createdRun?.getStatus() === "idle");

    const runRawTracePath = path.join(memoryDir, "agents", runId, "raw_traces.jsonl");
    const rootRawTracePath = path.join(memoryDir, "raw_traces.jsonl");

    await waitFor(async () => {
      try {
        const content = await fs.readFile(runRawTracePath, "utf-8");
        return content.includes("first real turn");
      } catch {
        return false;
      }
    });

    await expect(fs.access(rootRawTracePath)).rejects.toThrow();

    const terminated = await manager.terminateAgentRun(runId);
    expect(terminated).toBe(true);

    const restoredRunId = await manager.restoreAgentRun({
      runId,
      config: new AgentRunConfig({
        agentDefinitionId: "def-real-memory-layout",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
      }),
    });
    expect(restoredRunId).toBe(runId);

    const restoredRun = manager.getActiveRun(runId);
    expect(restoredRun).toBeTruthy();
    const secondMessageResult = await restoredRun?.postUserMessage(
      new AgentInputUserMessage("second real turn"),
    );
    expect(secondMessageResult?.accepted).toBe(true);
    await waitFor(() => restoredRun?.getStatus() === "idle");

    await waitFor(async () => {
      try {
        const content = await fs.readFile(runRawTracePath, "utf-8");
        return content.includes("second real turn");
      } catch {
        return false;
      }
    });

    await expect(fs.access(rootRawTracePath)).rejects.toThrow();
  });
});
