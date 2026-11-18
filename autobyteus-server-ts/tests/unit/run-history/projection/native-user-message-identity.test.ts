import { describe, expect, it } from "vitest";
import { buildNativeUserMessageTrace } from "autobyteus-ts/memory/raw-trace-ingestion.js";
import { LLMUserMessage } from "autobyteus-ts/llm/user-message.js";
import { toMemoryTraceEvent } from "../../../../src/agent-memory/services/raw-trace-record-normalizer.js";
import { buildHistoricalReplayEvents } from "../../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionConversation } from "../../../../src/run-history/projection/transformers/historical-replay-events-to-conversation.js";

/**
 * autobyteus-540 ASM-001 on the native runtime: the message id the page sent is kept from the native raw trace
 * (`buildNativeUserMessageTrace`, raw-trace-ingestion.ts) through the stored trace file row, the server's normalizer and
 * the run projection to the stored user message, so the page can find a send in a reconnect snapshot by its id.
 */
describe("native stored user message keeps the page's message id (autobyteus-540 ASM-001)", () => {
  it("raw trace row → memory trace event → stored conversation entry", () => {
    const trace = buildNativeUserMessageTrace(new LLMUserMessage({ content: "Run the build" }), {
      turnId: "turn-1", seq: 1, sourceEvent: "UserMessageReceivedEvent", fileAttachments: [],
      messageId: "client_msg-7", dedupeKey: "client_msg-7",
    });
    const row = trace.toDict();
    expect(row).toMatchObject({ trace_type: "user", message_id: "client_msg-7" });

    const conversation = buildRunProjectionConversation(buildHistoricalReplayEvents([toMemoryTraceEvent(row)]) as never);
    expect(conversation).toEqual([expect.objectContaining({ kind: "message", role: "user", content: "Run the build",
      messageId: "client_msg-7" })]);
  });
});
