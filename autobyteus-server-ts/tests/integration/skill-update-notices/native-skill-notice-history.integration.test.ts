import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentConfig } from "autobyteus-ts/agent/context/agent-config.js";
import { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import { AgentRuntimeState } from "autobyteus-ts/agent/context/agent-runtime-state.js";
import { AgentTurn } from "autobyteus-ts/agent/agent-turn.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MemoryIngestInputProcessor } from "autobyteus-ts/agent/input-processor/memory-ingest-input-processor.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import type { Message } from "autobyteus-ts/llm/utils/messages.js";
import { ChunkResponse, CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { buildHistoricalReplayEvents } from "../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionBundleFromEvents } from "../../../src/run-history/projection/run-projection-utils.js";
import { buildSkillUpdateNoticeMessage } from "../../../src/skill-update-notices/services/skill-update-notice-builder.js";

// REQ-011 for the native AutoByteus runtime: the notice is its own system notice in the run's
// history (combined with an input, or posted alone to a busy run), and the user's message is
// replayed as the user sent it.

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }
  protected async *_streamMessagesToLLM(_messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const NOTICE = "[Platform notice — skill updated]\n\nYour skill package `code-review` has been updated (/s/code-review).\n\nChanged files:\n- SKILL.md (changed)";
const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

/** One native run writing to a run memory folder, ingesting inputs as its input pipeline does. */
const createNativeRun = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "native-skill-notice-"));
  tempDirs.push(memoryDir);
  const memoryManager = new MemoryManager({ store: new FileMemoryStore(memoryDir, "run-native", { agentRootSubdir: "" }) });
  const model = new LLMModel({ name: "dummy", value: "dummy", canonicalName: "dummy", provider: LLMProvider.OPENAI });
  const context = new AgentContext("run-native", new AgentConfig("name", "role", "desc", new DummyLLM(model, new LLMConfig())),
    new AgentRuntimeState("run-native"));
  context.state.memoryManager = memoryManager;
  const ingest = async (message: AgentInputUserMessage, turnId: string) => {
    context.state.activeTurn = new AgentTurn(turnId);
    await new MemoryIngestInputProcessor().process(message, context, { agentInputUserMessage: message } as never);
  };
  const conversation = () => {
    const traces = new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
      .getRunMemoryView(path.basename(memoryDir), {
        includeRawTraces: true, includeArchive: false,
      }).rawTraces ?? [];
    return buildRunProjectionBundleFromEvents("run-native", buildHistoricalReplayEvents(traces)).conversation;
  };
  return { ingest, conversation };
};

describe("native AutoByteus skill update notice history", () => {
  it("replays a notice combined into the user's input as a system notice, then the message as sent", async () => {
    const run = await createNativeRun();
    const combined = new AgentInputUserMessage(`${NOTICE}\n\nReview PR 12.`, SenderType.USER, null, {
      ...platformInputPrefaceMetadata({ content: NOTICE, senderId: SKILL_UPDATE_NOTICE_SENDER_ID, originalContent: "Review PR 12." }),
    });

    await run.ingest(combined, "turn_0001");

    expect(run.conversation()).toEqual([
      expect.objectContaining({ kind: "system_task_notification", senderId: SKILL_UPDATE_NOTICE_SENDER_ID, content: NOTICE }),
      expect.objectContaining({ role: "user", content: "Review PR 12." }),
    ]);
  });

  it("replays a notice posted alone to a busy run as one system notice and no user message", async () => {
    const run = await createNativeRun();

    await run.ingest(buildSkillUpdateNoticeMessage(NOTICE), "turn_0002");

    expect(run.conversation()).toEqual([
      expect.objectContaining({ kind: "system_task_notification", senderId: SKILL_UPDATE_NOTICE_SENDER_ID, content: NOTICE }),
    ]);
  });
});
