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
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ClaudeTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/claude/claude-team-run-backend-factory.js";
import { ClaudeTeamManager } from "../../../src/agent-team-execution/backends/claude/claude-team-manager.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import {
  RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME,
  RAW_TRACES_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";

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
      const listeners = new Set<(event: unknown) => void>();
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
        getStatus: () => "IDLE",
        subscribeToEvents: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        postUserMessage: vi.fn(async () => {
          for (const listener of listeners) {
            listener(event(runId, AgentRunEventType.TURN_STARTED, { turnId: `turn-${runId}` }));
          }
          return { accepted: true, turnId: null, platformAgentRunId: `platform-${runId}` };
        }),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        emit: (eventType, payload) => {
          for (const listener of listeners) {
            listener(event(runId, eventType, payload));
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

const readView = (memoryDir: string) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeWorkingContext: true,
      includeEpisodic: false,
      includeSemantic: false,
    });

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe("cross-runtime memory persistence integration", () => {
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
      );

      expect(createdBackends[0]?.listenerCount()).toBe(1);
      await run.postUserMessage(new AgentInputUserMessage(`hello from ${runtimeKind}`));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
        id: "reasoning-1",
        segment_type: "reasoning",
        delta: "considering ",
      }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "reasoning-1" }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.TOOL_APPROVAL_REQUESTED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        arguments: { command: "pwd" },
      }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        arguments: { command: "pwd" },
      }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        invocation_id: "tool-1",
        tool_name: "run_bash",
        result: { stdout: memoryDir },
      }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
        id: "text-1",
        segment_type: "text",
        delta: "done",
      }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "text-1" }));
      run.emitLocalEvent(event(run.runId, AgentRunEventType.COMPACTION_STATUS, {
        status: "compacting",
        compact_boundary: "provider-owned",
      }));
      await recorder.waitForIdle(run.runId);

      await expect(fs.access(path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME))).resolves.toBeUndefined();
      await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).resolves.toBeUndefined();
      await expect(fs.access(path.join(memoryDir, RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME))).rejects.toThrow();

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
      expect(view.workingContext?.map((message) => message.role)).toEqual([
        "user",
        "assistant",
        "tool",
        "assistant",
      ]);
      expect(view.workingContext?.findLast((message) => message.role === "assistant")?.reasoning).toBe(
        "considering ",
      );
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
    );

    await run.postUserMessage(new AgentInputUserMessage("native should remain native-owned"));
    run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "native output",
    }));
    run.emitLocalEvent(event(run.runId, AgentRunEventType.SEGMENT_END, { id: "text-1" }));
    await recorder.waitForIdle(run.runId);

    await expect(fs.access(path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME))).rejects.toThrow();
    await expect(fs.access(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME))).rejects.toThrow();
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
    );

    await run.postUserMessage(new AgentInputUserMessage("attempt denied tool"));
    for (const eventType of [
      AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_APPROVAL_REQUESTED,
    ]) {
      run.emitLocalEvent(event(run.runId, eventType, {
        invocation_id: "denied-tool-1",
        tool_name: "run_bash",
        arguments: { command: "rm -rf /" },
      }));
    }
    run.emitLocalEvent(event(run.runId, AgentRunEventType.TOOL_DENIED, {
      invocation_id: "denied-tool-1",
      tool_name: "run_bash",
      reason: "policy denied",
    }));
    run.emitLocalEvent(event(run.runId, AgentRunEventType.TOOL_DENIED, {
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
      toolError: "policy denied",
      toolResult: { status: "denied", reason: "policy denied" },
    });
  });

  it("persists Claude team member memory under the member memory directory", async () => {
    const memoryRoot = await mkTempDir();
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
    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue({ toolNames: [] }),
    };
    const memberTeamContextBuilder = {
      build: vi.fn(async (input: {
        teamRunId: string;
        teamDefinitionId: string;
        currentMemberName: string;
        currentMemberRouteKey: string;
        currentMemberRunId: string;
      }) =>
        new MemberTeamContext({
          teamRunId: input.teamRunId,
          teamDefinitionId: input.teamDefinitionId,
          teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
          memberName: input.currentMemberName,
          memberRouteKey: input.currentMemberRouteKey,
          memberRunId: input.currentMemberRunId,
        }),
      ),
    };
    const teamFactory = new ClaudeTeamRunBackendFactory({
      memoryDir: memoryRoot,
      agentDefinitionService: agentDefinitionService as never,
      createTeamManager: (context) =>
        new ClaudeTeamManager(context, {
          agentRunManager,
          agentDefinitionService: agentDefinitionService as never,
          memberTeamContextBuilder: memberTeamContextBuilder as never,
        }),
    });

    const backend = await teamFactory.createBackend(
      new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
        memberConfigs: [
          {
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "claude-sonnet",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
            workspaceId: "workspace-1",
          },
        ],
      }),
    );

    const runtimeContext = backend.getRuntimeContext();
    const memberContext = runtimeContext?.memberContexts[0];
    expect(memberContext).toBeTruthy();
    expect(memberContext?.agentRunConfig.memoryDir).toBe(
      path.join(memoryRoot, "agent_teams", backend.runId, memberContext?.memberRunId ?? ""),
    );

    await backend.postMessage(new AgentInputUserMessage("team hello"), "Coordinator");
    const memberBackend = createdBackends[0];
    expect(memberBackend).toBeTruthy();
    memberBackend.emit(AgentRunEventType.SEGMENT_CONTENT, {
      id: "team-text-1",
      segment_type: "text",
      delta: "team reply",
    });
    memberBackend.emit(AgentRunEventType.SEGMENT_END, { id: "team-text-1" });
    await recorder.waitForIdle(memberContext?.memberRunId);

    const memberMemoryDir = memberContext?.agentRunConfig.memoryDir ?? "";
    const traces = await readLines(path.join(memberMemoryDir, RAW_TRACES_MEMORY_FILE_NAME));
    expect(traces.map((trace) => trace.trace_type)).toEqual(["user", "assistant"]);
    expect(traces.map((trace) => trace.turn_id)).toEqual([
      `turn-${memberContext?.memberRunId}`,
      `turn-${memberContext?.memberRunId}`,
    ]);
    const view = readView(memberMemoryDir);
    expect(view.workingContext?.map((message) => [message.role, message.content])).toEqual([
      ["user", "team hello"],
      ["assistant", "team reply"],
    ]);
  });
});
