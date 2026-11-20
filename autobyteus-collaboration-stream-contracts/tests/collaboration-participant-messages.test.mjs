import test from "node:test";
import assert from "node:assert/strict";
import {
  COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE,
  collaborationParticipantMessagesCursorSchema,
  collaborationParticipantMessagesDtoSchema,
  collaborationRootKindSchema,
} from "../dist/index.js";

const message = (overrides = {}) => ({
  messageId: "m1", senderAgentRunId: "writer-run", receiverAgentRunId: "agent-run", content: "done",
  messageType: "agent_message", referenceFiles: ["/tmp/report.md"], createdAt: "2026-11-01T00:00:00.000Z", ...overrides,
});
const page = (overrides = {}) => ({ messages: [], counterparts: [], hasMore: false, ...overrides });

test("participant messages carry stored messages of every root kind; a Team message may be empty (autobyteus-358)", () => {
  assert.deepEqual(collaborationRootKindSchema.options, ["agent", "agent_team", "agent_org"]);
  const parsed = collaborationParticipantMessagesDtoSchema.parse(page({ messages: [message(), message({ messageId: "m2", content: "" })] }));
  assert.equal(parsed.messages.length, 2);
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ messages: [message({ messageId: "" })] })));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ messages: [message({ extra: true })] })));
  // A message's line record (`counterpart`) never reaches the page: the page names its other agents in `counterparts`.
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ messages: [message({ counterpart: { address: null, nodeId: null } })] })));
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ baseChangeSequence: 1 })));
});

test("a page is at most 50, says whether older ones follow, and starts after a strict cursor (autobyteus-565)", () => {
  assert.equal(COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE, 50);
  assert.equal(collaborationParticipantMessagesDtoSchema.parse(page({ hasMore: true })).hasMore, true);
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse({ messages: [], counterparts: [] }));
  // The released field is gone: the past participants are counterparts of kind `past`.
  assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ pastParticipants: [] })));
  assert.deepEqual(collaborationParticipantMessagesCursorSchema.parse({ createdAt: "2026-11-01T00:00:00.000Z", messageId: "m1" }),
    { createdAt: "2026-11-01T00:00:00.000Z", messageId: "m1" });
  assert.throws(() => collaborationParticipantMessagesCursorSchema.parse({ createdAt: "2026-11-01T00:00:00.000Z" }));
  assert.throws(() => collaborationParticipantMessagesCursorSchema.parse({ createdAt: "", messageId: "m1" }));
  assert.throws(() => collaborationParticipantMessagesCursorSchema.parse({ createdAt: "t", messageId: "m1", offset: 50 }));
});

test("counterparts name each other agent the tree does not: past (autobyteus-469 D-5), another local run, another node (autobyteus-565)", () => {
  const counterparts = [
    { kind: "past", agentRunId: "writer-run", address: "/writer" },
    { kind: "run", agentRunId: "other-pm", address: "/project_task_manager" },
    { kind: "run", agentRunId: "deleted-run", address: null },
    { kind: "remote", agentRunId: "publisher-b", address: "/publisher", nodeName: "docker" },
    { kind: "remote", agentRunId: "linux-pm", address: null, nodeName: null },
  ];
  assert.deepEqual(collaborationParticipantMessagesDtoSchema.parse(page({ counterparts })).counterparts, counterparts);
  for (const invalid of [
    { kind: "past", agentRunId: "a", address: "" },
    { kind: "past", agentRunId: "a", address: null },
    { kind: "past", agentRunId: "a", address: "/a", label: "a" },
    { kind: "run", agentRunId: "a" },
    { kind: "run", agentRunId: "a", address: "/a", nodeName: "docker" },
    { kind: "remote", agentRunId: "a", address: "/a" },
    { kind: "remote", agentRunId: "", address: "/a", nodeName: "docker" },
    { kind: "node", agentRunId: "a", address: "/a" },
  ]) assert.throws(() => collaborationParticipantMessagesDtoSchema.parse(page({ counterparts: [invalid] })), JSON.stringify(invalid));
});
