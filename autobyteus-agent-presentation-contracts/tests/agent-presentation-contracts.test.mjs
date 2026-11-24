import test from "node:test";
import assert from "node:assert/strict";
import { agentPresentationMessageSchema } from "../dist/index.js";

const NODE_TIME = "2026-11-23T16:55:09.697Z";

test("accepts a strict root-neutral message and rejects root identity", () => {
  assert.equal(agentPresentationMessageSchema.parse({
    type: "SEGMENT_CONTENT",
    payload: { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "hello", occurred_at: NODE_TIME },
  }).type, "SEGMENT_CONTENT");
  assert.throws(() => agentPresentationMessageSchema.parse({
    type: "SEGMENT_CONTENT",
    payload: { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "hello", occurred_at: NODE_TIME, root_team_run_id: "team-1" },
  }));
});

// autobyteus-628 D-3: a timed message carries the node's time as ISO 8601; without it, or with another shape, it is refused.
test("a timed message requires the node's occurred_at", () => {
  const payload = { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "hello" };
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "SEGMENT_CONTENT", payload }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "SEGMENT_CONTENT", payload: { ...payload, occurred_at: 1795452909697 } }));
  assert.equal(agentPresentationMessageSchema.parse({ type: "SEGMENT_CONTENT", payload: { ...payload, occurred_at: NODE_TIME } }).payload.occurred_at, NODE_TIME);
});

test("accepts a background-task snapshot with a required nullable command and rejects the removed to-do message", () => {
  const payload = {
    task_id: "task-1",
    kind: "shell",
    description: "Sleep 20 then write marker",
    command: "sleep 20 && touch marker",
    status: "running",
    summary: null,
    end_reason: null,
    exit_code: null,
    started_at: "2026-09-29T16:48:20.000Z",
  };
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload }).type, "BACKGROUND_TASK_UPDATED");
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, status: "pending" } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, kind: "local_bash" } }));
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, command: null } }).payload.command, null);
  const { command: _command, ...withoutCommand } = payload;
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: withoutCommand }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, command: 42 } }));
  const ended = { ...payload, status: "stopped", end_reason: "time_limit", exit_code: null };
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: ended }).payload.end_reason, "time_limit");
  assert.equal(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, status: "failed", exit_code: 1 } }).payload.exit_code, 1);
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, end_reason: "timeout" } }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: { ...payload, exit_code: 1.5 } }));
  const { end_reason: _endReason, exit_code: _exitCode, ...withoutEnd } = payload;
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload: withoutEnd }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TODO_LIST_UPDATE", payload: { todos: [] } }));
});

test("compaction carries direct diagnostics separately from provider-native identity", () => {
 const keys = 'phase kind status turn_id compaction_operation_id requested_turn_id execution_turn_id selected_block_count compacted_block_count raw_trace_count summary_char_count compaction_invocation_id summarizer_provider completion_status compaction_model_identifier completion_reason summary_token_count error_message provider source_surface boundary_key provider_event_id provider_session_id provider_thread_id provider_timestamp trigger pre_tokens rotation_eligible'.split(' ');
 const payload = Object.fromEntries(keys.map(key=>[key,null]));
 Object.assign(payload,{phase:'completed',compaction_operation_id:'operation',summarizer_provider:'openai',completion_status:'complete',compaction_invocation_id:'invocation',summary_char_count:512,summary_token_count:128,occurred_at:NODE_TIME});
 const message = agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload});
 assert.equal(message.payload.provider,null); assert.equal(message.payload.summarizer_provider,'openai');
 assert.throws(()=>agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload:{...payload,semantic_fact_count:3}}));
 assert.throws(()=>agentPresentationMessageSchema.parse({type:'COMPACTION_STATUS',payload:{...payload,summary_token_count:'old-task-id'}}));
});

const runSummary = (overrides = {}) => {
  const price = { status: "single", price_per_million: 1 };
  return {
    run_id: "run-1", agent_definition_id: null, workspace_id: null,
    gross_input_tokens: 7062, standard_input_tokens: 8, cache_miss_input_tokens: 8, cache_read_input_tokens: 6903,
    cache_creation_input_tokens: 151, cache_creation_5m_input_tokens: 0, cache_creation_1h_input_tokens: 151,
    output_tokens: 33, reasoning_output_tokens: 26, billable_output_tokens: 33, total_tokens: 7095,
    cache_read_input_token_rate: null, standard_input_token_rate: null, cache_creation_input_token_rate: null,
    cache_state: "positive",
    estimated_api_input_cost: null, estimated_api_standard_input_cost: null, estimated_api_cache_read_input_cost: null,
    estimated_api_cache_creation_input_cost: null, estimated_api_cache_creation_5m_input_cost: null,
    estimated_api_cache_creation_1h_input_cost: null, estimated_api_output_cost: null,
    estimated_api_reasoning_output_cost: null, estimated_api_total_cost: null,
    currency: null, api_cost_status: "price_missing", missing_price_dimensions: [], pricing_policy_key: null,
    selected_pricing_tier_id: null,
    unit_prices: { standard_input: price, cache_read_input: price, cache_creation_input: price,
      cache_creation_5m_input: price, cache_creation_1h_input: price, output: price, reasoning_output: price },
    latest_prompt_tokens: 7062, effective_context_window_tokens: 200000, context_window_usage_percent: 3.531,
    context_compaction_threshold_tokens: 167000,
    latest_model_provider: "ANTHROPIC", latest_model_identifier: "claude-haiku-4-5", latest_runtime_kind: "claude_agent_sdk",
    usage_report_count: 4, revision: 5, updated_at: null,
    ...overrides,
  };
};

const tokenPayload = (overrides = {}) => {
  const nullable = "standard_input_tokens cache_miss_input_tokens cache_read_input_tokens cache_creation_input_tokens cache_creation_5m_input_tokens cache_creation_1h_input_tokens reasoning_output_tokens billable_output_tokens meter_delta_input_tokens meter_delta_output_tokens meter_delta_total_tokens input_price_per_million output_price_per_million cached_input_read_price_per_million cached_input_write_price_per_million cached_input_write_5m_price_per_million cached_input_write_1h_price_per_million estimated_api_input_cost estimated_api_standard_input_cost estimated_api_cache_read_input_cost estimated_api_cache_creation_input_cost estimated_api_cache_creation_5m_input_cost estimated_api_cache_creation_1h_input_cost estimated_api_output_cost estimated_api_reasoning_output_cost estimated_api_total_cost currency pricing_policy_key selected_pricing_tier_id turn_id llm_call_id model_provider model_identifier model_value".split(" ");
  return {
    ...Object.fromEntries(nullable.map((key) => [key, null])),
    usage_event_id: "event-1", idempotency_key: "claude_sdk_call:session:msg_1", observed_at: "2026-10-09T10:00:00.000Z",
    usage_scope: "per_call", input_token_semantic: "base_excludes_cache", cache_state: "positive",
    api_cost_status: "price_missing", missing_price_dimensions: [],
    latest_prompt_tokens: 7062, effective_context_window_tokens: 200000, context_window_usage_percent: 3.531,
    context_compaction_threshold_tokens: 167000, reports_model_call: true, output_throughput: null,
    run_summary_after_event: runSummary(), quality_flags: [],
    ...overrides,
  };
};

test("live token event carries the model-call fact, compaction threshold and summary revision", () => {
  const parsed = agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: tokenPayload() });
  assert.equal(parsed.payload.reports_model_call, true);
  assert.equal(parsed.payload.context_compaction_threshold_tokens, 167000);
  assert.equal(parsed.payload.run_summary_after_event.revision, 5);
  assert.equal(parsed.payload.run_summary_after_event.context_compaction_threshold_tokens, 167000);
  const reading = agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED",
    payload: tokenPayload({ reports_model_call: false, context_compaction_threshold_tokens: null }) });
  assert.equal(reading.payload.reports_model_call, false);
  const { reports_model_call: _flag, ...withoutFlag } = tokenPayload();
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: withoutFlag }));
  const { revision: _revision, ...summaryWithoutRevision } = runSummary();
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED",
    payload: tokenPayload({ run_summary_after_event: summaryWithoutRevision }) }));
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: tokenPayload({ unexpected: 1 }) }));
});

test("live token event carries one model call's TPS or null", () => {
  const reading = { method: "generation", output_tokens: 1762, duration_ms: 16940 };
  const parsed = agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: tokenPayload({ output_throughput: reading }) });
  assert.deepEqual(parsed.payload.output_throughput, reading);
  assert.equal(agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: tokenPayload() }).payload.output_throughput, null);
  for (const invalid of [{ ...reading, method: "report_interval" }, { ...reading, duration_ms: 2673.724 },
    { ...reading, output_tokens: -1 }, { ...reading, tokens_per_second: 104 }]) {
    assert.throws(() => agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: tokenPayload({ output_throughput: invalid }) }));
  }
  const { output_throughput: _tps, ...withoutTps } = tokenPayload();
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "TOKEN_USAGE_UPDATED", payload: withoutTps }));
});

test("autobyteus-448: AGENT_STATUS carries the required running background task count, a non-negative integer", () => {
  const payload = { recoverableBlock: null, status: "idle", background_tasks_running: 2, trigger: null, tool_name: null, error_message: null, error_details: null };
  assert.equal(agentPresentationMessageSchema.parse({ type: "AGENT_STATUS", payload }).payload.background_tasks_running, 2);
  const { background_tasks_running: _count, ...withoutCount } = payload;
  assert.throws(() => agentPresentationMessageSchema.parse({ type: "AGENT_STATUS", payload: withoutCount }));
  for (const bad of [-1, 1.5, "1", null]) {
    assert.throws(() => agentPresentationMessageSchema.parse({ type: "AGENT_STATUS", payload: { ...payload, background_tasks_running: bad } }));
  }
});
