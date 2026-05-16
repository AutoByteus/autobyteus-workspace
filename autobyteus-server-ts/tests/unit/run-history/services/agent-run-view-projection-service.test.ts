import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { buildRunProjectionBundle } from "../../../../src/run-history/projection/run-projection-utils.js";
import type { RunProjectionProvider } from "../../../../src/run-history/projection/run-projection-types.js";
import { AgentRunViewProjectionService } from "../../../../src/run-history/services/agent-run-view-projection-service.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const createMetadata = (
  runtimeKind: RuntimeKind,
  runId: string,
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-definition-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: null,
  llmModelIdentifier: "gpt-5.2-codex",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  platformAgentRunId: runtimeKind === RuntimeKind.CODEX_APP_SERVER ? "thread-1" : runId,
  lastKnownStatus: "IDLE",
  ...overrides,
});

const createProvider = (
  impl: RunProjectionProvider["buildProjection"],
): RunProjectionProvider => ({
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  buildProjection: impl,
});

describe("AgentRunViewProjectionService", () => {
  const tempDirs = new Set<string>();

  afterEach(async () => {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
    tempDirs.clear();
  });

  const createTempMemoryDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-projection-service-"));
    tempDirs.add(dir);
    return dir;
  };

  it("uses the local replay provider for Codex runs instead of runtime-native provider selection", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-local-only";
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, createMetadata(RuntimeKind.CODEX_APP_SERVER, runId));

    const localProvider = createProvider(
      vi.fn(async (input) => ({
        runId: input.source.runId,
        conversation: [
          {
            kind: "message",
            role: "user",
            content: `local:${input.source.platformRunId}`,
            ts: 1,
          },
        ],
        activities: [],
        summary: "local:thread-1",
        lastActivityAt: "2026-02-24T00:00:01.000Z",
      })),
    );
    const nativeCodexProvider = createProvider(vi.fn(async () => {
      throw new Error("Codex provider must not be reachable from normal UI history");
    }));

    const service = new AgentRunViewProjectionService(memoryDir, {
      metadataStore,
      localProjectionProvider: localProvider,
    });

    const projection = await service.getProjection(runId);

    expect(localProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(localProvider.buildProjection).toHaveBeenCalledWith({
      source: expect.objectContaining({
        runId,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memoryDir: path.join(memoryDir, "agents", runId),
        platformRunId: "thread-1",
      }),
    });
    expect(nativeCodexProvider.buildProjection).not.toHaveBeenCalled();
    expect(projection.conversation.map((entry) => entry.content)).toEqual(["local:thread-1"]);
  });

  it("keeps Codex projection empty when local replay history is missing", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-missing-local";
    const nativeCodexProvider = createProvider(vi.fn(async () => ({
      runId,
      conversation: [{ kind: "message", role: "assistant", content: "native recovery", ts: 2 }],
      activities: [],
      summary: "native recovery",
      lastActivityAt: "2026-02-24T00:00:02.000Z",
    })));

    const service = new AgentRunViewProjectionService(memoryDir);
    const projection = await service.getProjectionFromMetadata({
      runId,
      metadata: createMetadata(RuntimeKind.CODEX_APP_SERVER, runId),
    });

    expect(nativeCodexProvider.buildProjection).not.toHaveBeenCalled();
    expect(projection).toEqual(buildRunProjectionBundle(runId, [], []));
  });

  it("uses the same local replay path for Claude Agent SDK runs", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-claude-local-only";
    const memberMemoryDir = path.join(memoryDir, "agent_teams", "team-1", "member-1");
    const localProvider = createProvider(
      vi.fn(async (input) => ({
        runId: input.source.runId,
        conversation: [
          {
            kind: "message",
            role: "user",
            content: `runtime:${input.source.runtimeKind};memory:${input.source.memoryDir}`,
            ts: 1,
          },
        ],
        activities: [],
        summary: "claude local",
        lastActivityAt: "2026-02-24T00:00:01.000Z",
      })),
    );

    const service = new AgentRunViewProjectionService(memoryDir, {
      localProjectionProvider: localProvider,
    });

    const projection = await service.getProjectionFromMetadata({
      runId,
      metadata: createMetadata(RuntimeKind.CLAUDE_AGENT_SDK, runId, {
        memoryDir: memberMemoryDir,
        platformAgentRunId: "claude-session-1",
      }),
    });

    expect(localProvider.buildProjection).toHaveBeenCalledWith({
      source: expect.objectContaining({
        runId,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memoryDir: memberMemoryDir,
        platformRunId: "claude-session-1",
      }),
    });
    expect(projection.conversation[0]?.content).toBe(
      `runtime:${RuntimeKind.CLAUDE_AGENT_SDK};memory:${memberMemoryDir}`,
    );
  });

  it("uses the same local replay path for AutoByteus runs", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-autobyteus-local-only";
    const localProvider = createProvider(
      vi.fn(async (input) => ({
        runId: input.source.runId,
        conversation: [
          {
            kind: "message",
            role: "assistant",
            content: `runtime:${input.source.runtimeKind}`,
            ts: 1,
          },
        ],
        activities: [],
        summary: "autobyteus local",
        lastActivityAt: "2026-02-24T00:00:01.000Z",
      })),
    );

    const service = new AgentRunViewProjectionService(memoryDir, {
      localProjectionProvider: localProvider,
    });

    const projection = await service.getProjectionFromMetadata({
      runId,
      metadata: createMetadata(RuntimeKind.AUTOBYTEUS, runId),
    });

    expect(localProvider.buildProjection).toHaveBeenCalledWith({
      source: expect.objectContaining({
        runId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
    });
    expect(projection.conversation[0]?.content).toBe(`runtime:${RuntimeKind.AUTOBYTEUS}`);
  });

  it("builds Codex display rows from local replay traces with reasoning, tools, and assistant text in order", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-local-traces";
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, createMetadata(RuntimeKind.CODEX_APP_SERVER, runId));

    const runDir = path.join(memoryDir, "agents", runId);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      path.join(runDir, RAW_TRACES_MEMORY_FILE_NAME),
      [
        { trace_type: "user", content: "inspect workspace", turn_id: "turn-1", seq: 1, ts: 1 },
        { trace_type: "reasoning", content: "I should list files first.", turn_id: "turn-1", seq: 2, ts: 2 },
        {
          trace_type: "tool_call",
          tool_call_id: "call-1",
          tool_name: "run_bash",
          tool_args: { command: "ls" },
          turn_id: "turn-1",
          seq: 3,
          ts: 3,
        },
        {
          trace_type: "tool_result",
          tool_call_id: "call-1",
          tool_name: "run_bash",
          tool_args: { command: "ls" },
          tool_result: { stdout: "README.md\n" },
          turn_id: "turn-1",
          seq: 4,
          ts: 4,
        },
        { trace_type: "assistant", content: "README.md exists.", turn_id: "turn-1", seq: 5, ts: 5 },
      ].map((row) => JSON.stringify(row)).join("\n"),
      "utf-8",
    );

    const service = new AgentRunViewProjectionService(memoryDir, { metadataStore });
    const projection = await service.getProjection(runId);

    expect(projection.conversation.map((entry) => entry.kind)).toEqual([
      "message",
      "reasoning",
      "tool_call",
      "message",
    ]);
    expect(projection.conversation[0]).toMatchObject({ role: "user", content: "inspect workspace" });
    expect(projection.conversation[1]).toMatchObject({ kind: "reasoning", content: "I should list files first." });
    expect(projection.conversation[2]).toMatchObject({
      kind: "tool_call",
      invocationId: "call-1",
      toolName: "run_bash",
      toolArgs: { command: "ls" },
      toolResult: { stdout: "README.md\n" },
    });
    expect(projection.conversation[3]).toMatchObject({ role: "assistant", content: "README.md exists." });
    expect(projection.activities).toEqual([
      expect.objectContaining({
        invocationId: "call-1",
        toolName: "run_bash",
        type: "terminal_command",
        status: "success",
        arguments: { command: "ls" },
        result: { stdout: "README.md\n" },
      }),
    ]);
  });

  it("returns deterministic empty projection when the local replay provider fails", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-local-provider-fails";
    const localProvider = createProvider(vi.fn(async () => {
      throw new Error("local replay failed");
    }));

    const service = new AgentRunViewProjectionService(memoryDir, {
      localProjectionProvider: localProvider,
    });

    const projection = await service.getProjectionFromMetadata({
      runId,
      metadata: createMetadata(RuntimeKind.CODEX_APP_SERVER, runId),
    });

    expect(localProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(projection).toEqual(buildRunProjectionBundle(runId, [], []));
  });
});
