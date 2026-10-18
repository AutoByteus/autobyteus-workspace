import test from "node:test";
import assert from "node:assert/strict";
import { CollaborationStreamServerMessageSchema, RootExecutionEventDtoSchema } from "../dist/index.js";

const item = (agentRunId, delta) => ({
  member_address: `/${agentRunId}`, agent_run_id: agentRunId,
  message: { type: "SEGMENT_CONTENT", payload: { segment_id: `segment-${agentRunId}`, turn_id: "turn-1", segment_type: "text", delta } },
});
const envelope = (rootKind, extra) => ({ root_subject_kind: rootKind, root_run_id: "root-run-1", change_sequence: 21, ...extra });
const batchEvent = { kind: "agent_presentation_batch", items: [item("agent-a", "xy"), item("agent-b", "12")] };

for (const rootKind of ["agent_org", "agent"]) {
  test(`a ${rootKind} batch envelope covers a contiguous range`, () => {
    const parsed = CollaborationStreamServerMessageSchema.parse({
      type: "ROOT_EXECUTION_EVENT", payload: envelope(rootKind, { change_sequence_through: 26, event: batchEvent }),
    });
    assert.equal(parsed.payload.change_sequence_through, 26);
    assert.deepEqual(parsed.payload.event.items.map((entry) => entry.message.payload.delta), ["xy", "12"]);
    assert.ok(RootExecutionEventDtoSchema.parse(envelope(rootKind, { change_sequence_through: 21, event: batchEvent })));
  });

  test(`a ${rootKind} batch requires a valid range and at least one SEGMENT_CONTENT item`, () => {
    assert.throws(() => RootExecutionEventDtoSchema.parse(envelope(rootKind, { event: batchEvent })));
    assert.throws(() => RootExecutionEventDtoSchema.parse(envelope(rootKind, { change_sequence_through: 20, event: batchEvent })));
    assert.throws(() => RootExecutionEventDtoSchema.parse(envelope(rootKind, { change_sequence_through: 21, event: { ...batchEvent, items: [] } })));
    const status = { ...item("agent-a", "x"), message: { type: "AGENT_STATUS", payload: { status: "running" } } };
    assert.throws(() => RootExecutionEventDtoSchema.parse(envelope(rootKind, { change_sequence_through: 21, event: { ...batchEvent, items: [status] } })));
  });

  test(`a ${rootKind} single event keeps its one sequence and rejects a range`, () => {
    const single = { kind: "agent_presentation", ...item("agent-a", "x") };
    assert.ok(RootExecutionEventDtoSchema.parse(envelope(rootKind, { event: single })));
    assert.throws(() => RootExecutionEventDtoSchema.parse(envelope(rootKind, { change_sequence_through: 21, event: single })));
  });
}
