import test from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamServerMessage, serializeTeamStreamServerMessage } from "../dist/index.js";

const item = (agentRunId, delta) => ({
  agent_run_id: agentRunId, segment_id: `segment-${agentRunId}`, turn_id: "turn-1", segment_type: "text", delta,
});
const batch = (payload) => ({ type: "SEGMENT_CONTENT_BATCH", payload });

test("a content batch covers a contiguous sequence range with ordered per-segment items", () => {
  const parsed = parseTeamStreamServerMessage(batch({
    change_sequence: 21, change_sequence_through: 26, items: [item("agent-a", "xy"), item("agent-b", "12")],
  }));
  assert.equal(parsed.type, "SEGMENT_CONTENT_BATCH");
  assert.deepEqual(parsed.payload.items.map((entry) => [entry.agent_run_id, entry.delta]), [["agent-a", "xy"], ["agent-b", "12"]]);
  assert.equal(JSON.parse(serializeTeamStreamServerMessage(parsed)).payload.change_sequence_through, 26);
  assert.ok(parseTeamStreamServerMessage(batch({ change_sequence: 4, change_sequence_through: 4, items: [item("agent-a", "x")] })));
});

test("a content batch rejects an inverted range, no items and unknown fields", () => {
  assert.throws(() => parseTeamStreamServerMessage(batch({ change_sequence: 5, change_sequence_through: 4, items: [item("agent-a", "x")] })));
  assert.throws(() => parseTeamStreamServerMessage(batch({ change_sequence: 4, change_sequence_through: 4, items: [] })));
  assert.throws(() => parseTeamStreamServerMessage(batch({ change_sequence: 4, items: [item("agent-a", "x")] })));
  assert.throws(() => parseTeamStreamServerMessage(batch({ change_sequence: 4, change_sequence_through: 4, items: [{ ...item("agent-a", "x"), id: "legacy" }] })));
});

test("an ordinary Team message keeps its single sequence and does not accept a range", () => {
  const content = { type: "SEGMENT_CONTENT", payload: { change_sequence: 3, ...item("agent-a", "x") } };
  assert.equal(parseTeamStreamServerMessage(content).payload.change_sequence, 3);
  assert.throws(() => parseTeamStreamServerMessage({ ...content, payload: { ...content.payload, change_sequence_through: 3 } }));
});
