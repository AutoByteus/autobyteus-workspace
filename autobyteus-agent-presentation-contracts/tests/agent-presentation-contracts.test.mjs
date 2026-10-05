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

test("accepts a background-task snapshot with a required nullable command and rejects the removed to-do message", () => {
  const payload = {
    task_id: "task-1",
    kind: "shell",
    description: "Sleep 20 then write marker",
    command: "sleep 20 && touch marker",
    status: "running",
    summary: null,
    started_at: "2026-09-29T16:48:20.000Z",
  };
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload }).type, "BACKGROUND_TASK_UPDATED");
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, status: "pending" } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, kind: "local_bash" } }));
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, command: null } }).payload.command, null);
  const { command: _command, ...withoutCommand } = payload;
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: withoutCommand }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, command: 42 } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TODO_LIST_UPDATE", payload: { todos: [] } }));
});

test("compaction carries direct diagnostics separately from provider-native identity", () => {
 const keys = 'phase kind status turn_id compaction_operation_id requested_turn_id execution_turn_id selected_block_count compacted_block_count raw_trace_count summary_char_count compaction_invocation_id summarizer_provider completion_status compaction_model_identifier completion_reason summary_token_count error_message provider source_surface boundary_key provider_event_id provider_session_id provider_thread_id provider_timestamp trigger pre_tokens rotation_eligible'.split(' ');
 const payload = Object.fromEntries(keys.map(key=>[key,null]));
 Object.assign(payload,{phase:'completed',compaction_operation_id:'operation',summarizer_provider:'openai',completion_status:'complete',compaction_invocation_id:'invocation',summary_char_count:512,summary_token_count:128});
 const message = agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload});
 assert.equal(message.payload.provider,null); assert.equal(message.payload.summarizer_provider,'openai');
 assert.throws(()=>agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload:{...payload,semantic_fact_count:3}}));
 assert.throws(()=>agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload:{...payload,summary_token_count:'old-task-id'}}));
});
