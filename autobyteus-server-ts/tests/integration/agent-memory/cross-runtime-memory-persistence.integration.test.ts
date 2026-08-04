import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventConverter } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { ClaudeSessionEventConverter } from "../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import type {
  AgentRunBackend,
  AgentRunSourceEventBatchListener,
} from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";

const tempDirs = new Set<string>();

type CapturedRuntimeBackend = AgentRunBackend & {
  config: AgentRunConfig;
  emit: (eventType: AgentRunEventType, payload: Record<string, unknown>) => void;
  listenerCount: () => number;
};

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cross-runtime-memory-persistence-"));
  tempDirs.add(dir);
  return dir;
};

const event = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({
  eventType,
  runId,
  payload,
  statusHint: null,
});

const createRuntimeBackendFactory = (runtimeKind: RuntimeKind) => {
  const createdBackends: CapturedRuntimeBackend[] = [];
  const factory: AgentRunBackendFactory = {
    createBackend: vi.fn(async (config: AgentRunConfig, preferredRunId?: string | null) => {
      const runId = preferredRunId ?? `run-${runtimeKind}-${createdBackends.length + 1}`;
      const listeners = new Set<AgentRunSourceEventBatchListener>();
      const backend: CapturedRuntimeBackend = {
        config,
        runId,
        runtimeKind,
        getContext: () =>
          new AgentRunContext({
            runId,
            config,
            runtimeContext: null,
        }),
        isActive: () => true,
        getPlatformAgentRunId: () => `platform-${runId}`,
        getLifecycleSnapshot: () => ({
          availability: "active",
          phase: "idle",
          currentTurn: { kind: "NONE" },
        }),
        subscribeToSourceEventBatches: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        postUserMessage: vi.fn(async () => {
          for (const listener of listeners) {
            void listener([
              event(runId, AgentRunEventType.TURN_STARTED, { turnId: `turn-${runId}` }),
            ]);
          }
          return { accepted: true, turnId: null, platformAgentRunId: `platform-${runId}` };
        }),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        emit: (eventType, payload) => {
          for (const listener of listeners) {
            void listener([event(runId, eventType, payload)]);
          }
        },
        listenerCount: () => listeners.size,
      };
      createdBackends.push(backend);
      return backend;
    }),
    restoreBackend: vi.fn(),
  };
  return { factory, createdBackends };
};

const createNoopSidecar = () => ({
  attachToRun: vi.fn(() => () => undefined),
});

const readLines = async (filePath: string) =>
  (await fs.readFile(filePath, "utf-8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

const readView = (memoryDir: string, includeArchive = false) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeArchive,
      includeWorkingContext: true,
      includeEpisodic: false,
      includeSemantic: false,
    });

const createCodexMemoryHarness = async (preferredRunId: string) => {
  const memoryDir = await mkTempDir();
  const recorder = new AgentRunMemoryRecorder();
  const { factory } = createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER);
  const manager = new AgentRunManager({
    autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
    codexBackendFactory: factory,
    claudeBackendFactory: createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
    runFileChangeService: createNoopSidecar() as never,
    publishedArtifactRelayService: createNoopSidecar() as never,
    memoryRecorder: recorder,
  });
  const run = await manager.createAgentRun(
    new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-codex",
      autoExecuteTools: true,
      workspaceId: "workspace-1",
      memoryDir,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    preferredRunId,
  );
  return {
    memoryDir,
    recorder,
    run,
    converter: new CodexThreadEventConverter(run.runId),
    turnId: `turn-${run.runId}`,
  };
};

const emitAssistantTrace = async (
  run: { runId: string; publishEvent: (event: AgentRunEvent) => Promise<void> },
  turnId: string,
  id: string,
  delta: string,
  timestamp: number,
) => {
  await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
    id,
    turn_id: turnId,
    segment_type: "text",
    delta,
    timestamp,
  }));
  await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, {
    id,
    turn_id: turnId,
    segment_type: "text",
  }));
};

const emitConverted = async (
  run: { publishEvent: (event: AgentRunEvent) => Promise<void> },
  converted: AgentRunEvent[],
) => {
  for (const convertedEvent of converted) {
    await run.publishEvent(convertedEvent);
  }
};

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe("cross-runtime memory persistence integration", () => {
  it("persists open Codex reasoning before visible backend events and reloads it from local projection", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory, createdBackends } = createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: factory,
      claudeBackendFactory: createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });

    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-codex-reasoning",
        llmModelIdentifier: "gpt-codex",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        workspaceRootPath: "/tmp/codex-reasoning-storage",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "codex-reasoning-memory-run",
    );
    const backend = createdBackends[0];
    expect(backend?.listenerCount()).toBe(1);

    await run.postUserMessage(new AgentInputUserMessage("validate codex reasoning storage"));
    let timestamp = 1_720_100_000;
    const emit = (eventType: AgentRunEventType, payload: Record<string, unknown>) => {
      timestamp += 0.001;
      backend?.emit(eventType, { ts: timestamp, ...payload });
    };

    emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-tool",
      turn_id: `turn-${run.runId}-tool`,
      segment_type: "reasoning",
      delta: "backend think before explicit tool",
    });
    emit(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "backend-explicit-tool",
      turn_id: `turn-${run.runId}-tool`,
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
    });
    emit(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "backend-explicit-tool",
      turn_id: `turn-${run.runId}-tool`,
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
      result: { stdout: "/tmp/codex-reasoning-storage\n", exit_code: 0 },
    });
    emit(AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-tool",
      turn_id: `turn-${run.runId}-tool`,
      segment_type: "reasoning",
    });
    emit(AgentRunEventType.TURN_COMPLETED, { turnId: `turn-${run.runId}-tool` });

    emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-inferred-result",
      turn_id: `turn-${run.runId}-inferred`,
      segment_type: "reasoning",
      delta: "backend think before inferred terminal result",
    });
    emit(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "backend-inferred-tool",
      turn_id: `turn-${run.runId}-inferred`,
      tool_name: "run_bash",
      arguments: { command: "echo backend-inferred" },
      result: { stdout: "backend-inferred\n" },
    });
    emit(AgentRunEventType.TURN_COMPLETED, { turnId: `turn-${run.runId}-inferred` });

    emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-text",
      turn_id: `turn-${run.runId}-text`,
      segment_type: "reasoning",
      delta: "backend think before assistant text",
    });
    emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "assistant-text",
      turn_id: `turn-${run.runId}-text`,
      segment_type: "text",
      delta: "backend assistant text",
    });
    emit(AgentRunEventType.SEGMENT_END, {
      id: "assistant-text",
      turn_id: `turn-${run.runId}-text`,
      segment_type: "text",
    });
    emit(AgentRunEventType.TURN_COMPLETED, { turnId: `turn-${run.runId}-text` });

    emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-complete",
      turn_id: `turn-${run.runId}-complete`,
      segment_type: "reasoning",
      delta: "backend think before assistant complete",
    });
    emit(AgentRunEventType.ASSISTANT_COMPLETE, {
      turn_id: `turn-${run.runId}-complete`,
      content: "backend assistant complete",
    });
    emit(AgentRunEventType.TURN_COMPLETED, { turnId: `turn-${run.runId}-complete` });
    await recorder.waitForIdle(run.runId);

    const rawTraceLines = await readLines(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
    const persistedRelevantRows = rawTraceLines
      .filter((trace) =>
        trace.trace_type === "reasoning" ||
        trace.trace_type === "tool_call" ||
        trace.trace_type === "tool_result" ||
        (
          trace.trace_type === "assistant" &&
          String(trace.content ?? "").startsWith("backend assistant")
        ),
      )
      .map((trace) => ({
        traceType: trace.trace_type,
        content: trace.content ?? null,
        toolCallId: trace.tool_call_id ?? null,
      }));
    expect(persistedRelevantRows).toEqual([
      {
        traceType: "reasoning",
        content: "backend think before explicit tool",
        toolCallId: null,
      },
      {
        traceType: "tool_call",
        content: "",
        toolCallId: "backend-explicit-tool",
      },
      {
        traceType: "tool_result",
        content: "",
        toolCallId: "backend-explicit-tool",
      },
      {
        traceType: "reasoning",
        content: "backend think before inferred terminal result",
        toolCallId: null,
      },
      {
        traceType: "tool_call",
        content: "",
        toolCallId: "backend-inferred-tool",
      },
      {
        traceType: "tool_result",
        content: "",
        toolCallId: "backend-inferred-tool",
      },
      {
        traceType: "reasoning",
        content: "backend think before assistant text",
        toolCallId: null,
      },
      {
        traceType: "assistant",
        content: "backend assistant text",
        toolCallId: null,
      },
      {
        traceType: "reasoning",
        content: "backend think before assistant complete",
        toolCallId: null,
      },
      {
        traceType: "assistant",
        content: "backend assistant complete",
        toolCallId: null,
      },
    ]);

    const view = readView(memoryDir);
    const traces = view.rawTraces ?? [];
    const reasoningTraces = traces.filter((trace) => trace.traceType === "reasoning");
    expect(reasoningTraces.map((trace) => trace.content)).toEqual([
      "backend think before explicit tool",
      "backend think before inferred terminal result",
      "backend think before assistant text",
      "backend think before assistant complete",
    ]);
    expect(reasoningTraces).toHaveLength(4);
    expect(traces.filter((trace) => trace.toolCallId === "backend-explicit-tool").map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
    ]);
    expect(traces.filter((trace) => trace.toolCallId === "backend-inferred-tool").map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
    ]);

    const projection = await new AgentRunViewProjectionService(path.dirname(memoryDir))
      .getProjectionFromMetadata({
        runId: run.runId,
        metadata: {
          runId: run.runId,
          agentDefinitionId: "agent-def-codex-reasoning",
          workspaceRootPath: "/tmp/codex-reasoning-storage",
          memoryDir,
          llmModelIdentifier: "gpt-codex",
          llmConfig: null,
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: `platform-${run.runId}`,
          lastKnownStatus: "IDLE",
        },
      });

    const rowIndex = (predicate: (row: Record<string, unknown>) => boolean): number =>
      projection.conversation.findIndex((row) => predicate(row as unknown as Record<string, unknown>));
    const reasoningIndex = (content: string): number =>
      rowIndex((row) => row.kind === "reasoning" && row.content === content);
    const toolIndex = (invocationId: string): number =>
      rowIndex((row) => row.kind === "tool_call" && row.invocationId === invocationId);
    const messageIndex = (content: string): number =>
      rowIndex((row) => row.kind === "message" && row.content === content);

    expect(projection.conversation.filter((row) => row.kind === "reasoning")).toHaveLength(4);
    expect(reasoningIndex("backend think before explicit tool")).toBeLessThan(
      toolIndex("backend-explicit-tool"),
    );
    expect(reasoningIndex("backend think before inferred terminal result")).toBeLessThan(
      toolIndex("backend-inferred-tool"),
    );
    expect(reasoningIndex("backend think before assistant text")).toBeLessThan(
      messageIndex("backend assistant text"),
    );
    expect(reasoningIndex("backend think before assistant complete")).toBeLessThan(
      messageIndex("backend assistant complete"),
    );
  });

  it.each([
    [RuntimeKind.CODEX_APP_SERVER],
    [RuntimeKind.CLAUDE_AGENT_SDK],
  ] as const)(
    "persists standalone %s memory from AgentRunManager without websocket attachment",
    async (runtimeKind) => {
      const memoryDir = await mkTempDir();
      const recorder = new AgentRunMemoryRecorder();
      const { factory, createdBackends } = createRuntimeBackendFactory(runtimeKind);
      const manager = new AgentRunManager({
        autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
        codexBackendFactory:
          runtimeKind === RuntimeKind.CODEX_APP_SERVER
            ? factory
            : createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER).factory,
        claudeBackendFactory:
          runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
            ? factory
            : createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
        runFileChangeService: createNoopSidecar() as never,
        publishedArtifactRelayService: createNoopSidecar() as never,
        memoryRecorder: recorder,
      });

      const run = await manager.createAgentRun(
        new AgentRunConfig({
          runtimeKind,
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "claude-sonnet" : "gpt-codex",
          autoExecuteTools: true,
          workspaceId: "workspace-1",
          memoryDir,
          skillAccessMode: SkillAccessMode.NONE,
        }),
        `memory-persistence-${runtimeKind}`,
      );

      expect(createdBackends[0]?.listenerCount()).toBe(1);
      await run.postUserMessage(new AgentInputUserMessage(`hello from ${runtimeKind}`));
      await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
        id: "reasoning-1",
        segment_type: "reasoning",
        delta: "considering ",
      }));
      await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "reasoning-1" }));
      await run.publishEvent(event(run.runId, AgentRunEventType.TOOL_APPROVAL_REQUESTED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        arguments: { command: "pwd" },
      }));
      await run.publishEvent(event(run.runId, AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        arguments: { command: "pwd" },
      }));
      await run.publishEvent(event(run.runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        result: { stdout: memoryDir },
      }));
      await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
        id: "text-1",
        segment_type: "text",
        delta: "done",
      }));
      await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "text-1" }));
      await run.publishEvent(event(run.runId, AgentRunEventType.COMPACTION_STATUS, {
        status: "compacting",
        compact_boundary: "provider-owned",
      }));
      await recorder.waitForIdle(run.runId);

      await expect(fs.access(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).resolves.toBeUndefined();
      await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
      expect(new RunMemoryFileStore(memoryDir).getRawTraceArchiveRevisionInfo()).toBeNull();

      const view = readView(memoryDir);
      expect(view.rawTraces?.map((trace) => trace.traceType)).toEqual([
        "user",
        "reasoning",
        "tool_call",
        "tool_result",
        "assistant",
      ]);
      expect(view.rawTraces?.every((trace) => trace.turnId === `turn-${run.runId}`)).toBe(true);
      expect(view.rawTraces?.filter((trace) => trace.traceType === "tool_call")).toHaveLength(1);
      expect(view.rawTraces?.filter((trace) => trace.traceType === "tool_result")).toHaveLength(1);
      expect(view.rawTraces?.find((trace) => trace.traceType === "assistant")?.sourceEvent).toBe(
        AgentRunEventType.SEGMENT_END,
      );
      expect(view.workingContext).toBeNull();
    },
  );

  it("does not duplicate native Autobyteus memory through the server recorder", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory } = createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: factory,
      codexBackendFactory: createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER).factory,
      claudeBackendFactory: createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-native",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "native-memory-owned-run",
    );

    await run.postUserMessage(new AgentInputUserMessage("native should remain native-owned"));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "native output",
    }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "text-1" }));
    await recorder.waitForIdle(run.runId);

    await expect(fs.access(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).rejects.toThrow();
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
  });

  it("uses Codex thread/raw compaction duplicate-window conversion to write one marker and one archive segment", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory } = createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: factory,
      claudeBackendFactory: createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-codex",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "codex-compaction-memory-run",
    );
    const converter = new CodexThreadEventConverter(run.runId);
    const turnId = `turn-${run.runId}`;

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "codex-before-boundary",
      segment_type: "text",
      delta: "before codex compaction",
      timestamp: 1,
    }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, {
      id: "codex-before-boundary",
      segment_type: "text",
    }));
    const compactedEvents = converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: turnId,
        pre_tokens: 120000,
        timestamp: 2,
      },
    });
    expect(compactedEvents).toHaveLength(1);
    for (const converted of compactedEvents) {
      await run.publishEvent(converted);
    }
    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
          id: "compaction-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
      },
    })).toEqual([]);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "provider_compaction_boundary",
    ]);
    const manifest = store.readRawTraceArchiveManifest();
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({
      boundary_type: "provider_compaction_boundary",
      boundary_key: "codex:thread-1:compaction-1",
      status: "complete",
      record_count: 1,
    });
    expect(readView(memoryDir, true).rawTraces?.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(readView(memoryDir, true).rawTraces?.filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(1);
    await expect(fs.access(path.join(memoryDir, SEMANTIC_MEMORY_FILE_NAME))).rejects.toThrow();
    await expect(fs.access(path.join(memoryDir, EPISODIC_MEMORY_FILE_NAME))).rejects.toThrow();

    const restoredWriter = new ExternalRuntimeMemoryWriter({ memoryDir });
    const continued = restoredWriter.appendRawTrace({
      traceType: "assistant",
      turnId,
      content: "after restore",
      sourceEvent: "test-restore",
      ts: 3,
    });
    expect(continued.seq).toBe(3);
  });

  it("defers a captured Codex hosted-search placeholder and writes the terminal call before its name-bearing result", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-hosted-search-memory-run",
    );
    const rawPath = path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitConverted(run, converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "webSearch",
          id: "ws-hosted-search-1",
          query: "",
          action: { type: "other" },
        },
        turnId,
      },
    }));
    await recorder.waitForIdle(run.runId);

    await expect(fs.access(rawPath)).rejects.toThrow();

    await emitConverted(run, converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "webSearch",
          id: "ws-hosted-search-1",
          status: "completed",
          query: "AutoByteus provider lifecycle",
          action: {
            type: "search",
            query: "AutoByteus provider lifecycle",
            queries: ["AutoByteus provider lifecycle"],
          },
        },
        turnId,
      },
    }));
    await recorder.waitForIdle(run.runId);

    const traces = await readLines(rawPath);
    expect(traces.map((trace) => trace.trace_type)).toEqual(["tool_call", "tool_result"]);
    expect(traces[0]).toMatchObject({
      tool_call_id: "ws-hosted-search-1",
      tool_name: "search_web",
      tool_args: {
        query: "AutoByteus provider lifecycle",
        action_type: "search",
        queries: ["AutoByteus provider lifecycle"],
      },
    });
    expect(traces[0]).not.toHaveProperty("tool_result");
    expect(traces[0]).not.toHaveProperty("tool_error");
    expect(traces[1]).toMatchObject({
      tool_call_id: "ws-hosted-search-1",
      tool_name: "search_web",
      tool_result: {
        status: "completed",
        query: "AutoByteus provider lifecycle",
        action_type: "search",
        queries: ["AutoByteus provider lifecycle"],
      },
      tool_error: null,
    });
    expect(traces[1]).not.toHaveProperty("tool_args");
  });

  it("persists a normalized Claude MCP tool name on both the observed call and later result", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory } = createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER).factory,
      claudeBackendFactory: factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "agent-def-claude-tool-memory",
        llmModelIdentifier: "claude-sonnet",
        autoExecuteTools: true,
        workspaceId: "workspace-claude-tool-memory",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "claude-tool-memory-run",
    );
    const converter = new ClaudeSessionEventConverter(run.runId);
    const turnId = "turn-claude-tool-memory";
    const toolArgs = {
      url: "https://example.com/claude",
    };

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitConverted(run, converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "claude-write-1",
        turn_id: turnId,
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
        arguments: toolArgs,
      },
    }));
    await recorder.waitForIdle(run.runId);

    const rawPath = path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    let traces = await readLines(rawPath);
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      trace_type: "tool_call",
      tool_call_id: "claude-write-1",
      tool_name: "open_tab",
      tool_args: toolArgs,
    });

    await emitConverted(run, converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "claude-write-1",
        turn_id: turnId,
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
        arguments: toolArgs,
        result: [{
          type: "text",
          text: JSON.stringify({
            tab_id: "claude-browser-tab",
            status: "opened",
            url: "https://example.com/claude",
            title: "Claude Browser",
          }),
        }],
      },
    }));
    await recorder.waitForIdle(run.runId);

    traces = await readLines(rawPath);
    expect(traces.map((trace) => trace.trace_type)).toEqual(["tool_call", "tool_result"]);
    expect(traces[1]).toMatchObject({
      tool_call_id: "claude-write-1",
      tool_name: "open_tab",
      tool_result: {
        tab_id: "claude-browser-tab",
        status: "opened",
        url: "https://example.com/claude",
        title: "Claude Browser",
      },
      tool_error: null,
    });
    expect(traces[1]).not.toHaveProperty("tool_args");
  });

  it("keeps Codex contextCompaction start non-rotating in the recorder flow", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-context-compaction-start-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-start", "before codex compaction start", 1);
    await emitConverted(run, converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "contextCompaction",
          id: "context-item-start-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 2,
      },
    }));
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.getRawTraceArchiveRevisionInfo()).toBeNull();
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(store.listRawTracesOrdered()[1]?.toolResult).toMatchObject({
      provider: "codex",
      source_surface: "codex.context_compaction_started",
      boundary_key: "codex:thread-1:context-item-start-1:compacting",
      status: "compacting",
      rotation_eligible: false,
    });
  });

  it("rotates Codex raw traces at item/completed contextCompaction boundaries", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-context-compaction-completed-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-context-boundary", "before context boundary", 1);
    const completedEvents = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "context-item-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 2,
      },
    });
    expect(completedEvents).toHaveLength(1);
    await emitConverted(run, completedEvents);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "provider_compaction_boundary",
    ]);
    expect(store.listRawTracesOrdered()[0]?.toolResult).toMatchObject({
      provider: "codex",
      source_surface: "codex.context_compaction_completed",
      boundary_key: "codex:thread-1:context-item-1",
      status: "compacted",
      rotation_eligible: true,
    });
    expect(store.readRawTraceArchiveManifest().segments).toEqual([
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: "codex:thread-1:context-item-1",
        status: "complete",
        record_count: 1,
      }),
    ]);
    expect(readView(memoryDir, true).rawTraces?.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
    ]);
  });

  it("rotates Codex raw traces at rawResponseItem/completed context_compaction boundaries", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-raw-context-compaction-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-raw-boundary", "before raw context boundary", 1);
    const rawCompletedEvents = converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "context_compaction",
          id: "raw-context-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 2,
      },
    });
    expect(rawCompletedEvents).toHaveLength(1);
    await emitConverted(run, rawCompletedEvents);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "provider_compaction_boundary",
    ]);
    expect(store.listRawTracesOrdered()[0]?.toolResult).toMatchObject({
      provider: "codex",
      source_surface: "codex.raw_response_compaction_item",
      boundary_key: "codex:thread-1:raw-context-item-1",
      provider_response_id: "response-1",
      status: "compacted",
      rotation_eligible: true,
    });
    expect(store.readRawTraceArchiveManifest().segments).toEqual([
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: "codex:thread-1:raw-context-item-1",
        status: "complete",
        record_count: 1,
      }),
    ]);
  });

  it("dedupes duplicate Codex contextCompaction and raw context_compaction completed surfaces before rotation", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-context-compaction-duplicate-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-duplicate-boundary", "before duplicate boundary", 1);
    const itemCompleted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "duplicate-item-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 2,
      },
    });
    expect(itemCompleted).toHaveLength(1);
    await emitConverted(run, itemCompleted);
    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "context_compaction",
          id: "duplicate-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 3,
      },
    })).toEqual([]);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(1);
    expect(store.readRawTraceArchiveManifest().segments).toEqual([
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: "codex:thread-1:duplicate-item-1",
        status: "complete",
        record_count: 1,
      }),
    ]);
    expect(readView(memoryDir, true).rawTraces?.filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(1);
  });

  it("keeps distinct Codex stable completed IDs as separate provider boundaries", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-context-compaction-distinct-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-first-boundary", "before first boundary", 1);
    await emitConverted(run, converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "context-item-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 2,
      },
    }));
    await emitAssistantTrace(run, turnId, "codex-before-second-boundary", "before second boundary", 3);
    const secondCompleted = converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "context_compaction",
          id: "context-item-2",
          response_id: "response-2",
        },
        thread_id: "thread-1",
        turn_id: turnId,
        timestamp: 4,
      },
    });
    expect(secondCompleted).toHaveLength(1);
    await emitConverted(run, secondCompleted);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.readRawTraceArchiveManifest().segments).toEqual([
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: "codex:thread-1:context-item-1",
        status: "complete",
        record_count: 1,
      }),
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: "codex:thread-1:context-item-2",
        status: "complete",
        record_count: 2,
      }),
    ]);
    const completeView = readView(memoryDir, true).rawTraces ?? [];
    expect(completeView.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(completeView.filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(2);
    expect(completeView.map((trace) => trace.toolResult).filter(Boolean)).toEqual([
      expect.objectContaining({ boundary_key: "codex:thread-1:context-item-1" }),
      expect.objectContaining({ boundary_key: "codex:thread-1:context-item-2" }),
    ]);
  });

  it("does not rotate or record provider markers for Codex compaction_trigger alone", async () => {
    const { memoryDir, recorder, run, converter, turnId } = await createCodexMemoryHarness(
      "codex-compaction-trigger-memory-run",
    );

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await emitAssistantTrace(run, turnId, "codex-before-trigger", "before trigger", 1);
    expect(converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "compaction_trigger",
          id: "trigger-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
      },
    })).toEqual([]);
    expect(converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction_trigger",
          id: "trigger-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
      },
    })).toEqual([]);
    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction_trigger",
          id: "trigger-1",
        },
        thread_id: "thread-1",
        turn_id: turnId,
      },
    })).toEqual([]);
    await recorder.waitForIdle(run.runId);

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.getRawTraceArchiveRevisionInfo()).toBeNull();
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual(["assistant"]);
    expect(readView(memoryDir, true).rawTraces?.filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(0);
  });

  it("keeps Claude compacting status non-rotating and rotates only at compact_boundary", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory } = createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER).factory,
      claudeBackendFactory: factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "claude-sonnet",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "claude-compaction-memory-run",
    );
    const converter = new ClaudeSessionEventConverter(run.runId);
    const turnId = `turn-${run.runId}`;

    await run.publishEvent(event(run.runId, AgentRunEventType.TURN_STARTED, { turnId }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "claude-before-status",
      segment_type: "text",
      delta: "before claude status",
      timestamp: 1,
    }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, {
      id: "claude-before-status",
      segment_type: "text",
    }));
    for (const converted of converter.convert({
      method: ClaudeSessionEventName.STATUS_COMPACTING,
      params: {
        session_id: "session-1",
        uuid: "compaction-operation-1",
        turnId,
        timestamp: 2,
        input_tokens: 50000,
      },
    })) {
      await run.publishEvent(converted);
    }
    await recorder.waitForIdle(run.runId);

    let store = new RunMemoryFileStore(memoryDir);
    expect(store.getRawTraceArchiveRevisionInfo()).toBeNull();
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(store.listRawTracesOrdered()[1]?.toolResult).toMatchObject({
      provider: "claude",
      status: "compacting",
      rotation_eligible: false,
      semantic_compaction: false,
    });

    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "claude-before-boundary",
      segment_type: "text",
      delta: "before claude boundary",
      timestamp: 3,
    }));
    await run.publishEvent(event(run.runId, AgentRunEventType.SEGMENT_END, {
      id: "claude-before-boundary",
      segment_type: "text",
    }));
    for (const converted of converter.convert({
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: {
        session_id: "session-1",
        uuid: "compaction-operation-1",
        turnId,
        timestamp: 4,
        pre_tokens: 75000,
      },
    })) {
      await run.publishEvent(converted);
    }
    await recorder.waitForIdle(run.runId);

    store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      "provider_compaction_boundary",
    ]);
    expect(store.listRawTracesOrdered()[0]?.toolResult).toMatchObject({
      provider: "claude",
      status: "compacted",
      rotation_eligible: true,
      source_surface: "claude.compact_boundary",
    });
    expect(store.readRawTraceArchiveManifest().segments).toEqual([
      expect.objectContaining({
        boundary_type: "provider_compaction_boundary",
        boundary_key: `claude:session-1:claude.compact_boundary:compaction-operation-1:${turnId}`,
        status: "complete",
        record_count: 3,
      }),
    ]);
    const completeTraces = readView(memoryDir, true).rawTraces ?? [];
    expect(completeTraces.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(completeTraces[1]?.toolResult).toMatchObject({
      provider: "claude",
      status: "compacting",
      rotation_eligible: false,
      source_surface: "claude.status_compacting",
    });
    expect(completeTraces[3]?.toolResult).toMatchObject({
      provider: "claude",
      status: "compacted",
      rotation_eligible: true,
      source_surface: "claude.compact_boundary",
    });
  });

  it("records one denied tool result when duplicate tool lifecycle events are observed", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { factory } = createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER);
    const manager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: factory,
      claudeBackendFactory: createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK).factory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "gpt-codex",
        autoExecuteTools: false,
        workspaceId: "workspace-1",
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      "codex-denied-tool-memory-run",
    );

    await run.postUserMessage(new AgentInputUserMessage("attempt denied tool"));
    for (const eventType of [
      AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_APPROVAL_REQUESTED,
    ]) {
      await run.publishEvent(event(run.runId, eventType, {
        invocation_id: "denied-tool-1",
        tool_name: "run_bash",
        arguments: { command: "rm -rf /" },
      }));
    }
    await run.publishEvent(event(run.runId, AgentRunEventType.TOOL_DENIED, {
      invocation_id: "denied-tool-1",
      tool_name: "run_bash",
      reason: "policy denied",
    }));
    await run.publishEvent(event(run.runId, AgentRunEventType.TOOL_DENIED, {
      invocation_id: "denied-tool-1",
      tool_name: "run_bash",
      reason: "duplicate denial should be ignored",
    }));
    await recorder.waitForIdle(run.runId);

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => trace.traceType)).toEqual(["user", "tool_call", "tool_result"]);
    expect(traces.filter((trace) => trace.traceType === "tool_call")).toHaveLength(1);
    expect(traces.filter((trace) => trace.traceType === "tool_result")).toHaveLength(1);
    expect(traces[2]).toMatchObject({
      toolCallId: "denied-tool-1",
      toolName: "run_bash",
      toolArgs: null,
      toolError: "policy denied",
      toolResult: { status: "denied", reason: "policy denied" },
    });
  });

  it("persists mixed Claude team member memory under the member memory directory", async () => {
    const memoryRoot = await mkTempDir();
    const teamRunId = "team-run-memory-1";
    const memberRunId = "team-run-memory-1::coordinator";
    const memberMemoryDir = path.join(memoryRoot, "agent_teams", teamRunId, memberRunId);
    const recorder = new AgentRunMemoryRecorder();
    const { factory: claudeMemberFactory, createdBackends } = createRuntimeBackendFactory(RuntimeKind.CLAUDE_AGENT_SDK);
    const agentRunManager = new AgentRunManager({
      autoByteusBackendFactory: createRuntimeBackendFactory(RuntimeKind.AUTOBYTEUS).factory,
      codexBackendFactory: createRuntimeBackendFactory(RuntimeKind.CODEX_APP_SERVER).factory,
      claudeBackendFactory: claudeMemberFactory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });
    const memberContext = new MixedAgentMemberContext({
      memberName: "Coordinator",
      memberPath: ["Coordinator"],
      memberRouteKey: "coordinator",
      memberRunId,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: null,
    });
    const teamContext = new TeamRunContext({
      runId: teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "coordinator",
        memberConfigs: [{
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          memberRunId,
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "claude-sonnet",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          workspaceId: "workspace-1",
          memoryDir: memberMemoryDir,
        }],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "coordinator",
        memberContexts: [memberContext],
      }),
    });
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config: teamContext.config!.memberConfigs[0]!,
      agentRunManager,
      memberTeamContextBuilder: {
        build: vi.fn(async (input: {
          teamRunId: string;
          teamDefinitionId: string;
          currentMemberName: string;
          currentMemberRouteKey: string;
          currentMemberRunId: string;
        }) => new MemberTeamContext({
          teamRunId: input.teamRunId,
          teamDefinitionId: input.teamDefinitionId,
          teamBackendKind: TeamBackendKind.MIXED,
          memberName: input.currentMemberName,
          memberRouteKey: input.currentMemberRouteKey,
          memberRunId: input.currentMemberRunId,
          collaboration: {
            addressing: {
              rootTeamRunId: input.teamRunId,
              memberAddress: `/${input.currentMemberName}`,
            },
          },
        })),
      } as never,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    await handle.postMessage(new AgentInputUserMessage("team hello"));
    const memberBackend = createdBackends[0];
    expect(memberBackend).toBeTruthy();
    expect(memberBackend.config.memberTeamContext?.collaboration.addressing).toEqual({
      rootTeamRunId: teamRunId,
      memberAddress: "/Coordinator",
    });
    memberBackend.emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "team-text-1",
      segment_type: "text",
      delta: "team reply",
    });
    memberBackend.emit(AgentRunEventType.SEGMENT_END, { id: "team-text-1" });
    await recorder.waitForIdle(memberRunId);

    const traces = await readLines(path.join(memberMemoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
    expect(traces.map((trace) => trace.trace_type)).toEqual(["user", "assistant"]);
    expect(traces.map((trace) => trace.turn_id)).toEqual([
      `turn-${memberRunId}`,
      `turn-${memberRunId}`,
    ]);
    const view = readView(memberMemoryDir);
    expect(view.workingContext).toBeNull();
    await expect(fs.access(path.join(memberMemoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
  });
});
