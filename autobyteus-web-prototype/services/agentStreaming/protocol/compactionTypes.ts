
export interface CompactionStatusPayload {
  phase?: 'requested' | 'started' | 'completed' | 'failed' | null;
  kind?: string | null;
  status?: string | null;
  turn_id?: string | null;
  turnId?: string | null;
  compaction_operation_id?: string | null;
  requested_turn_id?: string | null;
  execution_turn_id?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  compaction_agent_definition_id?: string | null;
  compaction_agent_name?: string | null;
  compaction_runtime_kind?: string | null;
  compaction_model_identifier?: string | null;
  compaction_run_id?: string | null;
  compaction_task_id?: string | null;
  error_message?: string | null;
  runtime_kind?: string | null;
  provider?: string | null;
  source_surface?: string | null;
  boundary_key?: string | null;
  provider_event_id?: string | null;
  provider_session_id?: string | null;
  provider_thread_id?: string | null;
  provider_timestamp?: number | null;
  trigger?: string | null;
  pre_tokens?: number | null;
  rotation_eligible?: boolean | null;
}
