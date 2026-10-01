import type { CompactionStatusPhase } from '~/types/activity/compactionPhase';

export interface CompactionStatusPayload {
  phase?: CompactionStatusPhase | null;
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
  summary_char_count?: number | null;
  compaction_invocation_id?: string | null;
  summarizer_provider?: string | null;
  completion_status?: string | null;
  compaction_model_identifier?: string | null;
  completion_reason?: string | null;
  summary_token_count?: number | null;
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
