// autobyteus-628 D-2 (SR-002): a platform notice the node delivered in front of a user's input reads back right after
// that input, as it shows live, for every writer's stored shape; any other notice keeps its stored place.
// Production: the writers (the node's RuntimeMemoryEventAccumulator for external runtimes; the native MemoryManager,
// called in MemoryIngestInputProcessor's order, memory-ingest-input-processor.ts:62-77), the memory file stores,
// LocalMemoryRunViewProjectionProvider (every runtime's history) and the replay. The clock is set with fake timers.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { NATIVE_INPUT_TRACE_SOURCE_EVENT } from "autobyteus-ts/agent/input-processor/memory-ingest-input-processor.js";
import { LLMUserMessage } from "autobyteus-ts/llm/user-message.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import {
  RESTART_RESUME_NOTICE_SENDER_ID,
  SKILL_UPDATE_NOTICE_SENDER_ID,
} from "../../../../src/agent-execution/domain/system-task-notification-senders.js";
import { RuntimeMemoryEventAccumulator } from "../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const tempDirs: string[] = [];
const newMemoryDir = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "preface-notice-order-"));
  tempDirs.push(root);
  const memoryDir = path.join(root, "run-1");
  await fs.mkdir(memoryDir, { recursive: true });
  return memoryDir;
};

/** The run read back from the node: its conversation entries as kind:text rows. (The earlier-trace page has no notice
 * visual, so the notice's place does not show there.) */
const readBack = async (memoryDir: string, runtimeKind: RuntimeKind) => {
  const metadata: AgentRunMetadata = {
    runId: "run-1", agentDefinitionId: "agent-def-1", workspaceRootPath: "/tmp/workspace", memoryDir, llmModelIdentifier: "m",
    llmConfig: null, autoExecuteTools: true, runtimeKind, platformAgentRunId: null,
  };
  const source = { runId: "run-1", runtimeKind, workspaceRootPath: "/tmp/workspace", memoryDir, platformRunId: null, metadata };
  const provider = new LocalMemoryRunViewProjectionProvider("/unused");
  const projection = await provider.buildProjection({ source });
  return {
    conversation: projection.conversation.map((entry) =>
      entry.kind === "system_task_notification" ? `notice:${entry.content}` : `${entry.role}:${entry.content}`),
  };
};

/** An external runtime's turn, written by the node's accumulator as it records the live events. */
const externalWriter = (memoryDir: string) => {
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const accumulator = new RuntimeMemoryEventAccumulator({ runId: "run-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  return {
    notice: (turnId: string, senderId: string, content: string, ts: number) => accumulator.recordRunEvent({
      eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "run-1", statusHint: null,
      payload: { sender_id: senderId, content, message_id: `notice-${ts}`, turn_id: turnId, ts },
    }),
    input: (turnId: string, content: string, forwardedAtSeconds: number) => accumulator.recordForwardedUserMessage({
      runId: "run-1", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, config: {} as never, platformAgentRunId: null,
      message: new AgentInputUserMessage(content, SenderType.USER, null, { message_id: `msg-${forwardedAtSeconds}` }),
      result: { accepted: true, turnId } as never, forwardedAt: new Date(forwardedAtSeconds * 1000),
    }),
    reply: (turnId: string, content: string, ts: number) =>
      writer.appendRawTrace({ traceType: "assistant", turnId, content, sourceEvent: "SEGMENT_END", ts }),
  };
};

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("a preface notice reads back after the input it came with (autobyteus-628 D-2)", () => {
  it("external, the founder's stored shape: notice (seq 1, .697) then input (seq 2, .696) reads input, notice, reply", async () => {
    const memoryDir = await newMemoryDir();
    const run = externalWriter(memoryDir);
    run.input("turn-0", "earlier question", 1795452800.0);
    run.reply("turn-0", "please confirm", 1795452801.0);
    run.notice("turn-1", SKILL_UPDATE_NOTICE_SENDER_ID, "[Platform notice — skill updated]", 1795452909.697);
    run.input("turn-1", "You mean the new motor?", 1795452909.696);
    run.reply("turn-1", "My recommendation stands.", 1795452915.948);

    expect((await readBack(memoryDir, RuntimeKind.CLAUDE_AGENT_SDK)).conversation).toEqual([
      "user:earlier question", "assistant:please confirm", "user:You mean the new motor?",
      "notice:[Platform notice — skill updated]", "assistant:My recommendation stands.",
    ]);
  });

  it("external, the notice stored first with the same time as its input (the read path's time sort keeps the stored order at a tie): input, notice, reply", async () => {
    const memoryDir = await newMemoryDir();
    const run = externalWriter(memoryDir);
    run.notice("turn-1", SKILL_UPDATE_NOTICE_SENDER_ID, "[Platform notice — skill updated]", 1795452909.697);
    run.input("turn-1", "You mean the new motor?", 1795452909.697);
    run.reply("turn-1", "My recommendation stands.", 1795452915.948);

    expect((await readBack(memoryDir, RuntimeKind.ANTIGRAVITY_CLI)).conversation).toEqual([
      "user:You mean the new motor?", "notice:[Platform notice — skill updated]", "assistant:My recommendation stands.",
    ]);
  });

  it("external, already stored input first (the notice's publication came after the input's write): unchanged", async () => {
    const memoryDir = await newMemoryDir();
    const run = externalWriter(memoryDir);
    run.input("turn-1", "question", 100.0);
    run.notice("turn-1", SKILL_UPDATE_NOTICE_SENDER_ID, "skill updated", 100.2);
    run.reply("turn-1", "answer", 101.0);

    expect((await readBack(memoryDir, RuntimeKind.CODEX_APP_SERVER)).conversation)
      .toEqual(["user:question", "notice:skill updated", "assistant:answer"]);
  });

  it("external, a notice that opened its own turn and an input appended to that turn later: unchanged", async () => {
    const memoryDir = await newMemoryDir();
    const run = externalWriter(memoryDir);
    run.notice("turn-1", RESTART_RESUME_NOTICE_SENDER_ID, "the node restarted", 10.0);
    run.input("turn-1", "carry on", 12.4);
    run.reply("turn-1", "carrying on", 13.0);

    expect((await readBack(memoryDir, RuntimeKind.CLAUDE_AGENT_SDK)).conversation)
      .toEqual(["notice:the node restarted", "user:carry on", "assistant:carrying on"]);
  });

  describe("native AutoByteus: the notice and its input written one after the other", () => {
    beforeEach(() => vi.useFakeTimers());

    it.each([
      ["in the same millisecond", 0],
      ["a millisecond apart", 1],
      ["far apart (a slow write)", 250],
    ])("%s: input, notice, reply", async (_case, gapMs) => {
      const memoryDir = await newMemoryDir();
      const manager = new MemoryManager({ store: new FileMemoryStore(memoryDir, "run-1", { agentRootSubdir: "" }) });
      vi.setSystemTime(new Date("2026-11-23T16:55:09.697Z"));
      const turnId = manager.startTurn();
      manager.appendRawTrace({ turnId, traceType: "system_task_notification", content: "[Platform notice — skill updated]",
        senderId: SKILL_UPDATE_NOTICE_SENDER_ID, sourceEvent: NATIVE_INPUT_TRACE_SOURCE_EVENT, messageId: "notice-1" });
      vi.advanceTimersByTime(gapMs);
      manager.ingestUserMessage(new LLMUserMessage({ content: "You mean the new motor?" }), turnId, NATIVE_INPUT_TRACE_SOURCE_EVENT, [],
        null, { messageId: "msg-1" });
      vi.advanceTimersByTime(5_000);
      manager.appendRawTrace({ turnId, traceType: "assistant", content: "My recommendation stands.", sourceEvent: "LLMCompleteResponseReceivedEvent" });

      expect((await readBack(memoryDir, RuntimeKind.AUTOBYTEUS)).conversation).toEqual([
        "user:You mean the new motor?", "notice:[Platform notice — skill updated]", "assistant:My recommendation stands.",
      ]);
    });

    it("a native notice written under another source event (not a preface) keeps its place", async () => {
      const memoryDir = await newMemoryDir();
      const manager = new MemoryManager({ store: new FileMemoryStore(memoryDir, "run-1", { agentRootSubdir: "" }) });
      vi.setSystemTime(new Date("2026-11-23T16:55:00.000Z"));
      const turnId = manager.startTurn();
      manager.appendRawTrace({ turnId, traceType: "system_task_notification", content: "the node restarted",
        senderId: RESTART_RESUME_NOTICE_SENDER_ID, sourceEvent: "RestartResumeNotice" });
      vi.advanceTimersByTime(2_000);
      manager.ingestUserMessage(new LLMUserMessage({ content: "carry on" }), turnId, NATIVE_INPUT_TRACE_SOURCE_EVENT, []);

      expect((await readBack(memoryDir, RuntimeKind.AUTOBYTEUS)).conversation).toEqual(["notice:the node restarted", "user:carry on"]);
    });
  });
});
