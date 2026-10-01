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

test("accepts a background-task snapshot and rejects the removed to-do message", () => {
  const payload = {
    task_id: "task-1",
    kind: "shell",
    description: "Sleep 20 then write marker",
    status: "running",
    summary: null,
    started_at: "2026-09-29T16:48:20.000Z",
  };
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload }).type, "BACKGROUND_TASK_UPDATED");
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, status: "pending" } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, kind: "local_bash" } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TODO_LIST_UPDATE", payload: { todos: [] } }));
});
