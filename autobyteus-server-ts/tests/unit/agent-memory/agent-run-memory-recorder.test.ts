import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-memory-recorder-"));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

const createRun = (input: {
  runtimeKind: RuntimeKind;
  memoryDir: string | null;
  recorder: AgentRunMemoryRecorder;
  turnId?: string | null;
}) => {
  const listeners = new Set<(event: unknown) => void>();
  const config = new AgentRunConfig({
    runtimeKind: input.runtimeKind,
    agentDefinitionId: "agent-def-1",
    llmModelIdentifier: "model-1",
    autoExecuteTools: false,
    workspaceId: "workspace-1",
    memoryDir: input.memoryDir,
    skillAccessMode: SkillAccessMode.NONE,
  });
  const context = new AgentRunContext({ runId: "run-1", config, runtimeContext: null });
  const backend: AgentRunBackend = {
    runId: "run-1",
    runtimeKind: input.runtimeKind,
    getContext: () => context,
    isActive: () => true,
    getPlatformAgentRunId: () => "platform-run-1",
    getStatus: () => "IDLE",
    subscribeToEvents: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    postUserMessage: vi.fn(async () => ({ accepted: true, turnId: input.turnId ?? "turn-1" })),
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interrupt: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => ({ accepted: true })),
  };
  return {
    run: new AgentRun({ context, backend, commandObservers: [input.recorder] }),
    listenerCount: () => listeners.size,
  };
};

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType,
  runId: "run-1",
  payload,
  statusHint: null,
});

const readView = (memoryDir: string) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeEpisodic: false,
      includeSemantic: false,
    });

describe("AgentRunMemoryRecorder", () => {
  it("records accepted commands and normalized events without a stream subscriber", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { run } = createRun({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, memoryDir, recorder });
    recorder.attachToRun(run);

    await run.postUserMessage(new AgentInputUserMessage("hello"));
    run.emitLocalEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "hi there",
    }));
    run.emitLocalEvent(event(AgentRunEventType.SEGMENT_END, { id: "text-1" }));
    await recorder.waitForIdle("run-1");

    expect(readView(memoryDir).rawTraces?.map((trace) => [trace.traceType, trace.content])).toEqual([
      ["user", "hello"],
      ["assistant", "hi there"],
    ]);
  });

  it("skips native Autobyteus runs and detaches subscriptions", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { run, listenerCount } = createRun({ runtimeKind: RuntimeKind.AUTOBYTEUS, memoryDir, recorder });
    const unsubscribe = recorder.attachToRun(run);

    expect(listenerCount()).toBe(0);
    await run.postUserMessage(new AgentInputUserMessage("hello"));
    unsubscribe();
    await recorder.waitForIdle("run-1");

    await expect(fs.access(path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME))).rejects.toThrow();
  });

  it("detaches event subscriptions for recordable runs", async () => {
    const memoryDir = await mkTempDir();
    const recorder = new AgentRunMemoryRecorder();
    const { run, listenerCount } = createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir, recorder });
    const unsubscribe = recorder.attachToRun(run);

    expect(listenerCount()).toBe(1);
    unsubscribe();
    expect(listenerCount()).toBe(0);
  });
});
