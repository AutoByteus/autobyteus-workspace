import test from "node:test";
import assert from "node:assert/strict";
import { collaborationParticipantMessagesDtoSchema, collaborationRootKindSchema } from "../dist/index.js";

const message = (overrides = {}) => ({
  messageId: "m1", senderAgentRunId: "writer-run", receiverAgentRunId: "host-run", content: "done",
  messageType: "agent_message", referenceFiles: ["/tmp/report.md"], createdAt: "2026-11-01T00:00:00.000Z", ...overrides,
});

test("participant messages carry stored messages of every root kind; a Team message may be empty (autobyteus-358)", () => {
  assert.deepEqual(collaborationRootKindSchema.options, ["agent", "agent_team", "agent_org"]);
  const parsed = collaborationParticipantMessagesDtoSchema.parse({ messages: [message(), message({ messageId: "m2", content: "" })] });
  assert.equal(parsed.messages.length, 2);
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [message({ messageId: "" })] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [message({ extra: true })] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [], baseChangeSequence: 1 }));
});
