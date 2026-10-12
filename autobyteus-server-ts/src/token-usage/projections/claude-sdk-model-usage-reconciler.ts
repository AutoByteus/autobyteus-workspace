import type { TokenUsageUpdatedPayload } from '../../agent-execution/domain/agent-run-token-usage.js';
import { isClaudeSdkModelUsage, type ClaudeSdkModelUsage } from '../../agent-execution/domain/claude-sdk-usage.js';
import type { TokenUsageRunRecord } from '../domain/token-usage-run-record.js';

const fields = ['inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens'] as const;
type Counts = Pick<ClaudeSdkModelUsage, (typeof fields)[number]>;
type Checkpoint = ClaudeSdkModelUsage & { sessionId: string };
/** Main-loop usage admitted per call (`claude_sdk_call`) since the session's last turn-end result. */
type LiveSums = Counts & { sessionId: string };
type State = { checkpoints: Checkpoint[]; latestSelectedRawModelId: string | null; partial: boolean; live: LiveSums[] };
const MAX_CHECKPOINTS = 128;
const MAX_STATE_BYTES = 128 * 1024;
const emptyState = (): State => ({ checkpoints: [], latestSelectedRawModelId: null, partial: false, live: [] });
const zeroCounts = (): Counts => ({ inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 });
const safeSum = (...values: number[]): number | null => {
  const sum = values.reduce((total, value) => total + value, 0);
  return Number.isSafeInteger(sum) && sum >= 0 ? sum : null;
};
const flagsWith = (flags: string[], ...extra: string[]): string[] => [...new Set([...flags, ...extra])];
const countOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const sessionIdOf = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : null;
const sameSeries = (left: Checkpoint, right: Checkpoint): boolean =>
  left.sessionId === right.sessionId && left.provider === right.provider && left.rawModelId === right.rawModelId;

/** Tolerant projection (data_migration_guideline §3): checkpoints are required; absent `live` is empty. */
const decodeState = (raw: string | null): State | null => {
  if (raw === null) return null;
  try {
    if (Buffer.byteLength(raw) > MAX_STATE_BYTES) return null;
    const source = JSON.parse(raw) as Record<string, unknown>;
    if (!source || typeof source !== 'object' || !Array.isArray(source.checkpoints) ||
      source.checkpoints.length > MAX_CHECKPOINTS) return null;
    const checkpoints: Checkpoint[] = [];
    for (const row of source.checkpoints as unknown[]) {
      const sessionId = sessionIdOf((row as Record<string, unknown> | null)?.sessionId);
      if (!isClaudeSdkModelUsage(row) || !sessionId) return null;
      checkpoints.push({ rawModelId: row.rawModelId, canonicalModel: row.canonicalModel, provider: row.provider,
        inputTokens: row.inputTokens, outputTokens: row.outputTokens, cacheReadInputTokens: row.cacheReadInputTokens,
        cacheCreationInputTokens: row.cacheCreationInputTokens, sessionId });
    }
    const live: LiveSums[] = [];
    for (const row of Array.isArray(source.live) ? source.live as Record<string, unknown>[] : []) {
      const sessionId = sessionIdOf(row?.sessionId);
      const counts = fields.map((field) => countOf(row?.[field]));
      if (!sessionId || counts.some((count) => count === null)) return null;
      live.push({ sessionId, inputTokens: counts[0]!, outputTokens: counts[1]!,
        cacheReadInputTokens: counts[2]!, cacheCreationInputTokens: counts[3]! });
    }
    return {
      checkpoints,
      latestSelectedRawModelId: typeof source.latestSelectedRawModelId === 'string' ? source.latestSelectedRawModelId : null,
      partial: source.partial === true,
      live,
    };
  } catch { return null; }
};

const loadState = (record: TokenUsageRunRecord, flags: string[]): { state: State; flags: string[] } => {
  const decoded = decodeState(record.claudeSdkUsageStateJson);
  if (record.claudeSdkUsageStateJson !== null && decoded === null) flags = flagsWith(flags, 'claude_sdk_checkpoint_invalid');
  const state = decoded ?? emptyState();
  // Usage saved before this reconciler state existed cannot be attributed to a checkpoint.
  if (record.revision > 0n && record.claudeSdkUsageStateJson === null) {
    state.partial = true;
    flags = flagsWith(flags, 'claude_sdk_prior_policy_history_unattributed');
  }
  return { state, flags };
};

/** Encodes the state, or returns null when it would exceed the bounded state size. */
const encodeState = (state: State): string | null => {
  const encoded = JSON.stringify(state);
  return Buffer.byteLength(encoded) > MAX_STATE_BYTES ? null : encoded;
};

const resultPayload = (payload: TokenUsageUpdatedPayload, tokens: Counts | null, flags: string[]): TokenUsageUpdatedPayload => {
  const gross = tokens ? safeSum(tokens.inputTokens, tokens.cacheReadInputTokens, tokens.cacheCreationInputTokens) : null;
  const total = gross !== null && tokens ? safeSum(gross, tokens.outputTokens) : null;
  if (tokens && (gross === null || total === null)) {
    return resultPayload(payload, null, flagsWith(flags, 'claude_sdk_selected_safeint_exceeded'));
  }
  // Per-call observations carry exact TTL splits; a remainder (SDK compaction calls) has none.
  const assumed = Boolean(tokens && tokens.cacheCreationInputTokens > 0);
  if (assumed) flags = flagsWith(flags, 'claude_sdk_cache_write_1h_assumed');
  return {
    ...payload,
    claude_sdk_model_usage: [], // all-source checkpoints are private to this fold
    raw_event_json: null,
    raw_usage_json: null,
    reports_model_call: false,
    latest_prompt_tokens: null,
    effective_context_window_tokens: null,
    context_window_usage_percent: null,
    context_compaction_threshold_tokens: null,
    reported_input_tokens: tokens?.inputTokens ?? null,
    reported_output_tokens: tokens?.outputTokens ?? null,
    reported_total_tokens: tokens ? safeSum(tokens.inputTokens, tokens.outputTokens) : null,
    accounting_input_tokens: gross,
    accounting_output_tokens: tokens?.outputTokens ?? null,
    accounting_total_tokens: total,
    standard_input_tokens: tokens?.inputTokens ?? null,
    cache_miss_input_tokens: tokens?.inputTokens ?? null,
    cache_read_input_tokens: tokens?.cacheReadInputTokens ?? null,
    cache_creation_input_tokens: tokens?.cacheCreationInputTokens ?? null,
    cache_creation_5m_input_tokens: tokens ? 0 : null,
    cache_creation_1h_input_tokens: tokens?.cacheCreationInputTokens ?? null,
    cache_state: tokens === null ? 'unknown' : tokens.cacheReadInputTokens + tokens.cacheCreationInputTokens > 0 ? 'positive' : 'zero_reported',
    billable_input_tokens: gross,
    billable_output_tokens: tokens?.outputTokens ?? null,
    meter_delta_input_tokens: gross,
    meter_delta_output_tokens: tokens?.outputTokens ?? null,
    meter_delta_total_tokens: total,
    cost_basis: null,
    pricing_source: null,
    pricing_status: 'missing',
    pricing_missing_reason: 'claude_sdk_selected_price_unavailable',
    pricing_policy_key: null,
    pricing_snapshot_json: null,
    selected_pricing_tier_id: null,
    missing_price_dimensions: [],
    currency: null,
    input_price_per_million: null,
    output_price_per_million: null,
    cached_input_read_price_per_million: null,
    cached_input_write_price_per_million: null,
    cached_input_write_5m_price_per_million: null,
    cached_input_write_1h_price_per_million: null,
    estimated_api_input_cost: null,
    estimated_api_standard_input_cost: null,
    estimated_api_cache_read_input_cost: null,
    estimated_api_cache_creation_input_cost: null,
    estimated_api_cache_creation_5m_input_cost: null,
    estimated_api_cache_creation_1h_input_cost: null,
    estimated_api_output_cost: null,
    estimated_api_reasoning_output_cost: null,
    estimated_api_total_cost: null,
    api_cost_status: 'price_missing',
    quality_flags: flags,
  };
};

/**
 * D-2: one Claude main-loop model call was admitted additively. Its usage is added to the
 * session's live sums so the turn-end result contributes only what calls could not see.
 */
export const recordClaudeSdkCall = (input: {
  record: TokenUsageRunRecord;
  payload: TokenUsageUpdatedPayload;
}): { record: TokenUsageRunRecord; flags: string[] } => {
  const { payload } = input;
  const loaded = loadState(input.record, []);
  let flags = loaded.flags;
  const state = loaded.state;
  const sessionId = payload.claude_sdk_session_id;
  if (!sessionId) {
    state.partial = true;
    return { record: { ...input.record, claudeSdkUsageStateJson: JSON.stringify(state) },
      flags: flagsWith(flags, 'claude_sdk_call_session_missing') };
  }
  const call: Counts = {
    inputTokens: payload.reported_input_tokens ?? 0,
    outputTokens: payload.reported_output_tokens ?? 0,
    cacheReadInputTokens: payload.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: payload.cache_creation_input_tokens ?? 0,
  };
  const index = state.live.findIndex((row) => row.sessionId === sessionId);
  const previous = index >= 0 ? state.live[index]! : { sessionId, ...zeroCounts() };
  const sums = fields.map((field) => safeSum(previous[field], call[field]));
  if (sums.some((sum) => sum === null)) {
    state.partial = true;
    return { record: { ...input.record, claudeSdkUsageStateJson: JSON.stringify(state) },
      flags: flagsWith(flags, 'claude_sdk_selected_safeint_exceeded') };
  }
  const next: LiveSums = { sessionId, inputTokens: sums[0]!, outputTokens: sums[1]!,
    cacheReadInputTokens: sums[2]!, cacheCreationInputTokens: sums[3]! };
  if (index >= 0) state.live[index] = next;
  else state.live.push(next);
  const encoded = encodeState(state);
  if (encoded === null) {
    flags = flagsWith(flags, 'claude_sdk_checkpoint_capacity_exceeded');
    return { record: input.record, flags };
  }
  return { record: { ...input.record, claudeSdkUsageStateJson: encoded }, flags };
};

/**
 * D-3: the turn-end result is reconciliation only. It contributes, per dimension,
 * `max(0, selected modelUsage delta − live sums since the checkpoint)`: the SDK's own
 * compaction calls, which emit no per-call usage. It is never a model call and carries no reading.
 */
export const reconcileClaudeSdkResult = (input: {
  record: TokenUsageRunRecord;
  payload: TokenUsageUpdatedPayload;
}): { record: TokenUsageRunRecord; payload: TokenUsageUpdatedPayload } => {
  const { payload } = input;
  const loaded = loadState(input.record, [...payload.quality_flags]);
  let flags = loaded.flags;
  const state = loaded.state;
  const sessionId = payload.claude_sdk_session_id;
  const rows = payload.claude_sdk_model_usage ?? [];
  if (!sessionId || payload.quality_flags.includes('claude_sdk_identity_invalid') || !payload.selected_model_value) {
    state.partial = true;
    state.latestSelectedRawModelId = null;
    flags = flagsWith(flags, 'claude_sdk_selected_source_unusable');
    return { record: { ...input.record, claudeSdkUsageStateJson: JSON.stringify(state) },
      payload: resultPayload(payload, null, flags) };
  }
  const knownSession = state.checkpoints.some((row) => row.sessionId === sessionId);
  // SR-012: a resume-opened process restarts cumulative totals from an unknown origin. Its first
  // result re-anchors every checkpoint and admits nothing; its calls were already counted live.
  const seriesRestart = payload.claude_sdk_series_restart === true;
  const zeroOrigin = payload.claude_sdk_query_kind === 'create' || knownSession;
  const liveIndex = state.live.findIndex((row) => row.sessionId === sessionId);
  const live: Counts = liveIndex >= 0 ? state.live[liveIndex]! : zeroCounts();
  let remainder: Counts | null = null;
  const next = structuredClone(state);
  // The live sums are consumed by this result whatever it contributes.
  next.live = next.live.filter((row) => row.sessionId !== sessionId);
  next.latestSelectedRawModelId = payload.selected_match_state === 'matched'
    ? payload.selected_resolved_raw_model_id ?? null : null;
  for (const row of rows) {
    const key: Checkpoint = { ...row, sessionId };
    const index = next.checkpoints.findIndex((previous) => sameSeries(previous, key));
    const previous = index >= 0 ? next.checkpoints[index]! : null;
    if (!previous && next.checkpoints.length >= MAX_CHECKPOINTS) {
      next.partial = true;
      flags = flagsWith(flags, 'claude_sdk_checkpoint_capacity_exceeded');
      continue;
    }
    const current: Checkpoint = { ...row, canonicalModel: row.canonicalModel ?? previous?.canonicalModel ?? null, sessionId };
    const regressed = !seriesRestart && Boolean(previous && fields.some((field) => row[field] < previous[field]));
    const mayContribute = !seriesRestart && !regressed && Boolean(previous || zeroOrigin);
    // A regression is a reset baseline: suppress this row, then advance from it once.
    if (index >= 0) next.checkpoints[index] = current;
    else next.checkpoints.push(current);
    if (row.rawModelId !== payload.selected_resolved_raw_model_id || payload.selected_match_state !== 'matched') continue;
    if (seriesRestart) {
      flags = flagsWith(flags, 'claude_sdk_series_restart_rebaselined');
      continue;
    }
    if (!mayContribute) {
      next.partial = true;
      flags = flagsWith(flags, regressed ? 'claude_sdk_selected_regressed' : 'claude_sdk_selected_legacy_resume_baselined');
      continue;
    }
    const delta = Object.fromEntries(fields.map((field) => [field, row[field] - (previous?.[field] ?? 0)])) as Counts;
    if (fields.some((field) => live[field] > delta[field])) flags = flagsWith(flags, 'claude_sdk_live_exceeds_cumulative');
    remainder = Object.fromEntries(fields.map((field) => [field, Math.max(0, delta[field] - live[field])])) as Counts;
  }
  if (payload.selected_match_state !== 'matched') {
    next.partial = true;
    flags = flagsWith(flags, 'claude_sdk_selected_model_missing');
  }
  const encoded = encodeState(next);
  if (encoded === null) {
    flags = flagsWith(flags, 'claude_sdk_checkpoint_capacity_exceeded');
    return { record: input.record, payload: resultPayload(payload, null, flags) };
  }
  return { record: { ...input.record, claudeSdkUsageStateJson: encoded },
    payload: resultPayload(payload, remainder, flags) };
};

export const latestSelectedClaudeSdkRawIdFromState = (raw: string | null): string | null =>
  decodeState(raw)?.latestSelectedRawModelId ?? null;
