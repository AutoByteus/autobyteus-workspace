import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-434 REQ-004 / AC-005: a user message an external runtime (Claude Agent SDK, Codex, AGY) received is stored
 * with its `message_id` and `dedupe_key`, and the run projection returns them, so a view that loads the conversation
 * during the message's turn matches the live input state's entry to the stored message (one copy, in place).
 * An older record without identity still loads. Real files, the real recorder, writer and projection provider.
 */
describe("the identity of a stored external-runtime user message", () => {
  let root: string;
  let runDir: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "external-user-identity-"));
    runDir = path.join(root, "agents", "run-1");
    fs.mkdirSync(runDir, { recursive: true });
  });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  const forward = (message: AgentInputUserMessage, turnId: string, forwardedAt: number) => {
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
    new RuntimeMemoryEventAccumulator({
      runId: "run-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    }).recordForwardedUserMessage({
      runId: "run-1",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      config: new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, agentDefinitionId: "agent-def-1", llmModelIdentifier: "claude",
        autoExecuteTools: false, memoryDir: runDir,
      }),
      platformAgentRunId: "session-1",
      message,
      result: { accepted: true, turnId },
      forwardedAt: new Date(forwardedAt),
    });
  };
  const userRecords = () => fs.readdirSync(runDir)
    .filter((name) => name.startsWith("raw_traces") && name.endsWith(".jsonl"))
    .flatMap((name) => fs.readFileSync(path.join(runDir, name), "utf8").split("\n").filter(Boolean))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((record) => record.trace_type === "user");
  const projectedUsers = async () => {
    const projection = await new LocalMemoryRunViewProjectionProvider(root).buildProjection({
      source: { runId: "run-1", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, workspaceRootPath: "/w", memoryDir: runDir, platformRunId: "p" } as never,
    });
    return projection.conversation.filter((entry) => entry.role === "user");
  };

  it("stores message_id and dedupe_key from the forwarded message's metadata, and the projection returns them", async () => {
    forward(new AgentInputUserMessage("Run the long build", SenderType.USER, null, {
      message_id: " client_msg-1 ", dedupe_key: "client_msg-1",
    }), "turn-1", 1_000);

    expect(userRecords().map(({ content, message_id, dedupe_key }) => ({ content, message_id, dedupe_key })))
      .toEqual([{ content: "Run the long build", message_id: "client_msg-1", dedupe_key: "client_msg-1" }]);
    expect((await projectedUsers()).map(({ content, messageId, dedupeKey }) => ({ content, messageId, dedupeKey })))
      .toEqual([{ content: "Run the long build", messageId: "client_msg-1", dedupeKey: "client_msg-1" }]);
  });

  it("writes no identity keys for a message without identity, and an older record without them still loads", async () => {
    // The shape of the user's real records written before the fix (no message_id, no dedupe_key).
    fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"), `${JSON.stringify({
      id: "old-1", ts: 1, turn_id: "turn-0", seq: 1, trace_type: "user", content: "older message",
      source_event: "AgentRun.postUserMessage",
    })}\n`);
    forward(new AgentInputUserMessage("no identity"), "turn-1", 2_000);

    expect(userRecords().every((record) => !("message_id" in record) && !("dedupe_key" in record))).toBe(true);
    expect((await projectedUsers()).map((entry) => [entry.content, entry.messageId ?? null, entry.dedupeKey ?? null]))
      .toEqual([["older message", null, null], ["no identity", null, null]]);
  });
});
