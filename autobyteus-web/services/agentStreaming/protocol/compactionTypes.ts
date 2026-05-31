import type { TeamStreamIdentityPayload } from './teamStreamIdentityTypes';

export interface CompactionStatusPayload extends TeamStreamIdentityPayload {
  phase: 'requested' | 'started' | 'completed' | 'failed';
  turn_id?: string | null;
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
}
