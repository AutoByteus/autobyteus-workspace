import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalMemoryRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import {
  RAW_TRACES_ARCHIVE_DIR_NAME,
  RAW_TRACES_MANIFEST_FILE_NAME,
} from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { buildActiveTraceGeneration } from "../../../../src/run-history/projection/active-trace-event-page-policy.js";

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
      includeArchive: false,
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
      path.join(explicitMemoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
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
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: explicitMemoryDir,
        platformRunId: "platform-thread-id",
        metadata: createMetadata({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memoryDir: explicitMemoryDir,
          platformAgentRunId: "platform-thread-id",
        }),
      },
    });

    expect(projection.conversation).toEqual([
      expect.objectContaining({ content: "from local memory", role: "user" }),
    ]);
  });

  it("restores exact system instructions from active-only memory into Activity without conversation leakage", async () => {
    const getRunMemoryView = vi.fn().mockReturnValue({
      rawTraces: [{
        scope: "run", id: "raw-system-id", traceType: "system_instruction",
        sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED", content: "  exact\nactive prompt  ",
        turnId: null, seq: null, ts: 5,
      }],
    });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
    } as never);

    const projection = await provider.buildProjection({
      source: {
        runId: "server-run-1", runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace", memoryDir: null, platformRunId: null,
        metadata: createMetadata(),
      },
    });

    expect(getRunMemoryView).toHaveBeenCalledWith("server-run-1", expect.objectContaining({
      includeArchive: false,
    }));
    expect(projection.conversation).toEqual([]);
    expect(projection.activities).toEqual([{
      kind: "system_instruction",
      activityId: "raw-system-id",
      content: "  exact\nactive prompt  ",
      ts: 5,
    }]);
  });

  it("reconstructs all active lifecycle evidence before selecting the newest 100 events", async () => {
    const rawTraces = [
      { traceType: "user", content: "oldest", turnId: "old", seq: 1, ts: 1 },
      {
        traceType: "tool_call",
        toolCallId: "call-before-window",
        toolName: "run_bash",
        toolArgs: { command: "pwd" },
        turnId: "t0",
        seq: 2,
        ts: 2,
      },
      ...Array.from({ length: 98 }, (_, index) => ({
        traceType: "user",
        content: `message-${index}`,
        turnId: `t${index + 1}`,
        seq: index + 3,
        ts: index + 3,
      })),
      {
        traceType: "tool_result",
        toolCallId: "call-before-window",
        toolResult: { stdout: "/tmp" },
        turnId: "t0",
        seq: 101,
        ts: 101,
      },
      { traceType: "user", content: "newest", turnId: "t101", seq: 102, ts: 102 },
    ];
    const getRunMemoryView = vi.fn().mockReturnValue({ rawTraces });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
    } as never);

    const projection = await provider.buildProjection({
      source: {
        runId: "server-run-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: null,
        platformRunId: null,
        metadata: createMetadata(),
      },
    });

    expect(projection.conversation).toHaveLength(100);
    expect(projection.conversation[0]).toEqual(expect.objectContaining({
      invocationId: "call-before-window",
      toolName: "run_bash",
      toolResult: { stdout: "/tmp" },
    }));
    expect(projection.conversation.at(-1)).toEqual(expect.objectContaining({ content: "newest" }));
    expect(projection.hasEarlierActiveTraceEvents).toBe(true);
  });

  it("builds earlier pages from the complete active snapshot without normal/archive selection", async () => {
    const rawTraces = Array.from({ length: 160 }, (_, index) => ({
      id: `raw-${index}`,
      traceType: "assistant",
      content: `event-${index}`,
      turnId: `turn-${index}`,
      seq: index,
      ts: index,
    }));
    const getRunMemoryView = vi.fn();
    const getActiveRawTraceSnapshot = vi.fn().mockReturnValue({
      rawTraces,
      records: [],
      device: "1",
      inode: "2",
      manifestGeneration: "3:boundary",
    });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
      getActiveRawTraceSnapshot,
    } as never);
    const page = await provider.buildActiveTracePage({
      source: {
        runId: "server-run-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: null,
        platformRunId: null,
        metadata: createMetadata(),
      },
      subjectFingerprint: "subject",
      beforeCursor: null,
    });
    expect(getRunMemoryView).not.toHaveBeenCalled();
    expect(getActiveRawTraceSnapshot).toHaveBeenCalledWith("server-run-1");
    expect(page.events).toHaveLength(150);
    expect(page.events[0].eventId).toBe("raw:v1:6:raw-10");
    expect(page.loadedEarlierCount).toBe(50);
    expect(page.hasEarlier).toBe(true);
  });

  it("preserves production-shaped user, assistant, and tool images with stable page identities", async () => {
    const getActiveRawTraceSnapshot = vi.fn().mockReturnValue({
      rawTraces: [
        {
          id: "user-1", traceType: "user", content: "look", media: { images: ["images/user.png"] },
          turnId: "turn-1", seq: 1, ts: 1,
        },
        {
          id: "assistant-1", traceType: "assistant", content: "seen", media: { images: ["images/assistant.png"] },
          turnId: "turn-1", seq: 2, ts: 2,
        },
        {
          id: "tool-call", traceType: "tool_call", toolCallId: "call-1", toolName: "inspect",
          media: { images: ["images/tool.png"] }, turnId: "turn-1", seq: 3, ts: 3,
        },
      ],
      records: [], device: "1", inode: "2", manifestGeneration: null,
    });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getActiveRawTraceSnapshot,
    } as never);
    const page = await provider.buildActiveTracePage({
      source: {
        runId: "server-run-1", runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace", memoryDir: null, platformRunId: null,
        metadata: createMetadata(),
      },
      subjectFingerprint: "subject",
      beforeCursor: null,
    });

    expect(page.events.map(event => ({
      eventId: event.eventId,
      visuals: event.visuals.map(visual => visual.kind === "media"
        ? `${visual.kind}:${visual.mediaType}:${visual.urls[0]}`
        : visual.kind),
    }))).toEqual([
      { eventId: "raw:v1:6:user-1", visuals: ["user"] },
      { eventId: "raw:v1:11:assistant-1", visuals: ["assistant_text", "media:image:images/assistant.png"] },
      { eventId: "tool:v1:6:turn-1:6:call-1", visuals: ["tool_card", "media:image:images/tool.png"] },
    ]);
    expect(page.events[0]?.visuals[0]).toMatchObject({
      kind: "user",
      attachments: [{ locator: "images/user.png", mediaType: "image" }],
    });
  });

  it("never opens an archive segment while building an active-trace page", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "active-trace-page-provider-"));
    tempDirs.add(root);
    const explicitMemoryDir = path.join(root, "local-run-id");
    const archiveDir = path.join(explicitMemoryDir, RAW_TRACES_ARCHIVE_DIR_NAME);
    await fs.mkdir(archiveDir, { recursive: true });
    const active = Array.from({ length: 151 }, (_, index) => JSON.stringify({
      id: `active-${index}`, trace_type: "assistant", content: `active-${index}`,
      turn_id: `turn-${index}`, seq: index, ts: index,
    })).join("\n") + "\n";
    await fs.writeFile(path.join(explicitMemoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), active, "utf8");
    await fs.writeFile(path.join(explicitMemoryDir, RAW_TRACES_MANIFEST_FILE_NAME), JSON.stringify({
      schema_version: 1,
      next_segment_index: 2,
      segments: [{
        index: 1, file_name: "raw_traces_000001.jsonl", boundary_type: "native_compaction",
        boundary_key: "archive-only", archived_at: 1, record_count: 1, status: "complete",
      }],
    }), "utf8");
    await fs.writeFile(
      path.join(archiveDir, "raw_traces_000001.jsonl"),
      "this archive sentinel is deliberately not valid JSONL\n",
      "utf8",
    );
    const provider = new LocalMemoryRunViewProjectionProvider("/unused");

    const page = await provider.buildActiveTracePage({
      source: {
        runId: "server-run-1", runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace", memoryDir: explicitMemoryDir,
        platformRunId: null, metadata: createMetadata({ memoryDir: explicitMemoryDir }),
      },
      subjectFingerprint: "subject",
      beforeCursor: null,
    });

    expect(page.events).toHaveLength(150);
    expect(page.events.every(event => event.eventId.includes("active-"))).toBe(true);
    expect(page.activeGeneration).toMatch(/^[a-f0-9]{64}$/);
  });

  it("excludes run-scoped system instructions before Event Monitor generation and selection", async () => {
    const getActiveRawTraceSnapshot = vi.fn().mockReturnValue({
      rawTraces: [
        {
          scope: "run", id: "raw-system-id", traceType: "system_instruction",
          sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED", content: "private prompt",
          turnId: null, seq: null, ts: 1,
        },
        {
          scope: "turn", id: "user-1", traceType: "user", content: "hello",
          turnId: "turn-1", seq: 1, ts: 2,
        },
      ],
      records: [], device: "1", inode: "2", manifestGeneration: "3:boundary",
    });
    const provider = new LocalMemoryRunViewProjectionProvider("/tmp/memory", {
      getActiveRawTraceSnapshot,
    } as never);

    const page = await provider.buildActiveTracePage({
      source: {
        runId: "server-run-1", runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace", memoryDir: null, platformRunId: null,
        metadata: createMetadata(),
      },
      subjectFingerprint: "subject",
      beforeCursor: null,
    });

    expect(page.events.map((event) => event.eventId)).toEqual(["raw:v1:6:user-1"]);
    expect(JSON.stringify(page)).not.toContain("private prompt");
    expect(page.activeGeneration).toBe(buildActiveTraceGeneration({
      device: "1", inode: "2", manifestGeneration: "3:boundary",
      earliestEventId: "raw:v1:6:user-1",
    }));
  });
});
