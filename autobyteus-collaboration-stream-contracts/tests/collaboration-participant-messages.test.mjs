import test from "node:test";
import assert from "node:assert/strict";
import { collaborationParticipantMessagesDtoSchema, collaborationRootKindSchema } from "../dist/index.js";

const message = (overrides = {}) => ({
  messageId: "m1", senderAgentRunId: "writer-run", receiverAgentRunId: "host-run", content: "done",
  messageType: "agent_message", referenceFiles: ["/tmp/report.md"], createdAt: "2026-11-01T00:00:00.000Z", ...overrides,
});

test("participant messages carry stored messages of every root kind; a Team message may be empty (autobyteus-358)", () => {
  assert.deepEqual(collaborationRootKindSchema.options, ["agent", "agent_team", "agent_org"]);
  const parsed = collaborationParticipantMessagesDtoSchema.parse({ messages: [message(), message({ messageId: "m2", content: "" })], pastParticipants: [] });
  assert.equal(parsed.messages.length, 2);
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [message({ messageId: "" })], pastParticipants: [] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [message({ extra: true })], pastParticipants: [] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [], pastParticipants: [], baseChangeSequence: 1 }));
});

test("participant messages name the agents of delegated runs that left the tree (autobyteus-469 D-5)", () => {
  const parsed = collaborationParticipantMessagesDtoSchema.parse({ messages: [message()],
    pastParticipants: [{ agentRunId: "writer-run", address: "/writer" }] });
  assert.deepEqual(parsed.pastParticipants, [{ agentRunId: "writer-run", address: "/writer" }]);
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [], pastParticipants: [{ agentRunId: "a", address: "" }] }));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [], pastParticipants: [{ agentRunId: "a", address: "/a", label: "a" }] }));
});
