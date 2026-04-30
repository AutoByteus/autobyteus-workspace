import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalMemoryRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const tempDirs = new Set<string>();

const createMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "server-run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: null,
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: true,
  skillAccessMode: null,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: "native-agent-1",
  lastKnownStatus: "IDLE",
  ...overrides,
});

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe("LocalMemoryRunViewProjectionProvider", () => {
  it("uses the server run id for default local memory reads", async () => {
    const getRunMemoryView = vi.fn().mockReturnValue({
      rawTraces: [
        { traceType: "user", content: "hello", turnId: "t1", seq: 1, ts: 1 },
        {
          traceType: "tool_call",
          toolCallId: "call-1",
          toolName: "run_bash",
          toolArgs: { command: "pwd" },
          turnId: "t1",
          seq: 2,
          ts: 2,
        },
        {
          traceType: "tool_result",
          toolCallId: "call-1",
          toolResult: { stdout: "/tmp" },
          turnId: "t1",
          seq: 3,
          ts: 3,
        },
      ],
    });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
    } as never);

    const projection = await provider.buildProjection({
      source: {
        runId: "server-run-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: null,
        platformRunId: "native-agent-abc",
        metadata: createMetadata({ platformAgentRunId: "native-agent-abc" }),
      },
    });

    expect(getRunMemoryView).toHaveBeenCalledWith("server-run-1", {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
      includeArchive: true,
    });
    expect(projection.runId).toBe("server-run-1");
    expect(projection.conversation).toHaveLength(2);
    expect(projection.activities).toEqual([
      expect.objectContaining({
        invocationId: "call-1",
        toolName: "run_bash",
        status: "success",
      }),
    ]);
  });

  it("uses explicit memoryDir basename instead of platform run id", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "local-memory-provider-"));
    tempDirs.add(root);
    const explicitMemoryDir = path.join(root, "local-run-id");
    await fs.mkdir(explicitMemoryDir, { recursive: true });
    await fs.writeFile(
      path.join(explicitMemoryDir, RAW_TRACES_MEMORY_FILE_NAME),
      JSON.stringify({
        id: "rt-1",
        trace_type: "user",
        content: "from local memory",
        turn_id: "t1",
        seq: 1,
        ts: 1,
        source_event: "test",
      }) + "\n",
      "utf-8",
    );
    const provider = new LocalMemoryRunViewProjectionProvider("/unused");

    const projection = await provider.buildProjection({
      source: {
        runId: "server-run-1",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: explicitMemoryDir,
        platformRunId: "platform-thread-id",
        metadata: createMetadata({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memoryDir: explicitMemoryDir,
          platformAgentRunId: "platform-thread-id",
        }),
      },
    });

    expect(projection.conversation).toEqual([
      expect.objectContaining({ content: "from local memory", role: "user" }),
    ]);
  });
});
