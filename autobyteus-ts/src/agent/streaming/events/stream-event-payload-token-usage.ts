import { BaseStreamPayload, isRecord, parseUsage } from './stream-event-payload-utils.js';
import type { LlmTokenUsageObservation } from '../../../llm/utils/llm-token-usage-observation.js';

export class TokenUsageUpdatedData extends BaseStreamPayload {
  usage_event_id?: string;
  idempotency_key?: string;
  turn_id?: string | null;
  llm_call_id?: string | null;
  call_sequence?: number | null;
  usage: LlmTokenUsageObservation;
  runtime_kind?: string;
  ingestion_kind?: string;
  latest_prompt_tokens?: number | null;
  effective_context_window_tokens?: number | null;
  context_window_usage_percent?: number | null;
  raw_event_json?: Record<string, unknown> | null;

  constructor(data: Record<string, any>) {
    super(data);
    const usage = parseUsage(data.usage);
    if (!usage) {
      throw new Error('TokenUsageUpdatedData requires a valid usage observation.');
    }
    this.usage = usage;
    this.usage_event_id = typeof data.usage_event_id === 'string' ? data.usage_event_id : undefined;
    this.idempotency_key = typeof data.idempotency_key === 'string' ? data.idempotency_key : undefined;
    this.turn_id = typeof data.turn_id === 'string' || data.turn_id === null ? data.turn_id : undefined;
    this.llm_call_id = typeof data.llm_call_id === 'string' || data.llm_call_id === null ? data.llm_call_id : undefined;
    this.call_sequence = typeof data.call_sequence === 'number' ? data.call_sequence : undefined;
    this.runtime_kind = typeof data.runtime_kind === 'string' ? data.runtime_kind : undefined;
    this.ingestion_kind = typeof data.ingestion_kind === 'string' ? data.ingestion_kind : undefined;
    this.latest_prompt_tokens = typeof data.latest_prompt_tokens === 'number' || data.latest_prompt_tokens === null
      ? data.latest_prompt_tokens
      : undefined;
    this.effective_context_window_tokens = typeof data.effective_context_window_tokens === 'number' || data.effective_context_window_tokens === null
      ? data.effective_context_window_tokens
      : undefined;
    this.context_window_usage_percent = typeof data.context_window_usage_percent === 'number' || data.context_window_usage_percent === null
      ? data.context_window_usage_percent
      : undefined;
    this.raw_event_json = isRecord(data.raw_event_json) || data.raw_event_json === null ? data.raw_event_json : undefined;
  }
}

export const createTokenUsageUpdatedData = (payload: unknown): TokenUsageUpdatedData => {
  if (!isRecord(payload)) {
    throw new Error(`Cannot create TokenUsageUpdatedData from ${typeof payload}`);
  }
  return new TokenUsageUpdatedData(payload);
};
