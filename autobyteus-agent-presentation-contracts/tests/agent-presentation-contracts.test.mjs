import test from "node:test";
import assert from "node:assert/strict";
import { agentPresentationMessageSchema } from "../dist/index.js";

test("accepts a strict root-neutral message and rejects root identity", () => {
  assert.equal(agentPresentationMessageSchema.parse({
    type: "SEGMENT_CONTENT",
    payload: { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "hello" },
  }).type, "SEGMENT_CONTENT");
  assert.throws(() => agentPresentationMessageSchema.parse({
    type: "SEGMENT_CONTENT",
    payload: { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "hello", root_team_run_id: "team-1" },
  }));
});
