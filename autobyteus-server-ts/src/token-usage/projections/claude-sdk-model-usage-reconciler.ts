import type { TokenUsageUpdatedPayload } from '../../agent-execution/domain/agent-run-token-usage.js';
import { isClaudeSdkModelUsage, type ClaudeSdkModelUsage, type ClaudeSdkMainLoopUsage } from '../../agent-execution/domain/claude-sdk-usage.js';
import type { TokenUsageRunRecord } from '../domain/token-usage-run-record.js';

type Checkpoint = ClaudeSdkModelUsage & { sessionId: string };
type State = { version: 1; checkpoints: Checkpoint[]; selectedDetails: ClaudeSdkModelUsage[];
  latestSelectedRawModelId: string | null; partial: boolean };
const MAX_CHECKPOINTS = 128;
const MAX_STATE_BYTES = 128 * 1024;
const emptyState = (): State => ({ version: 1, checkpoints: [], selectedDetails: [],
  latestSelectedRawModelId: null, partial: false });
const fields = ['inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens'] as const;
type Counts = Pick<ClaudeSdkModelUsage, (typeof fields)[number]>;
const safeSum = (...values: number[]): number | null => {
  const sum = values.reduce((total, value) => total + value, 0);
  return Number.isSafeInteger(sum) && sum >= 0 ? sum : null;
};
const flagsWith = (flags: string[], ...extra: string[]): string[] => [...new Set([...flags, ...extra])];
const tokenRowKeys = new Set(['rawModelId', 'canonicalModel', 'provider', ...fields]);
const isTokenOnlyRow = (value: unknown, checkpoint: boolean): boolean =>
  isClaudeSdkModelUsage(value) && Object.keys(value).every((key) =>
    tokenRowKeys.has(key) || (checkpoint && key === 'sessionId'));
const sameSeries = (left: Checkpoint, right: Checkpoint): boolean =>
  left.sessionId === right.sessionId && left.provider === right.provider && left.rawModelId === right.rawModelId;
const decodeState = (raw: string | null): State | null => {
  if (raw === null) return null;
  try {
    if (Buffer.byteLength(raw) > MAX_STATE_BYTES) return null;
    const state = JSON.parse(raw) as State;
    if (state.version !== 1 || !Array.isArray(state.checkpoints) || !Array.isArray(state.selectedDetails) ||
      typeof state.partial !== 'boolean' ||
      (state.latestSelectedRawModelId !== null && typeof state.latestSelectedRawModelId !== 'string') ||
      state.checkpoints.length > MAX_CHECKPOINTS ||
      !state.checkpoints.every((row) => isTokenOnlyRow(row, true) && typeof row.sessionId === 'string' && row.sessionId.length <= 256) ||
      !state.selectedDetails.every((row) => isTokenOnlyRow(row, false))) return null;
    return state;
  } catch { return null; }
};

/** Top-level terminal usage is eligible only when every selected per-turn dimension reconciles. */
const selectedCacheSplit = (main: ClaudeSdkMainLoopUsage | null | undefined, delta: Counts): {
  fiveMinutes: number;
  oneHour: number;
  assumed: boolean;
} => {
  if (delta.cacheCreationInputTokens === 0) return { fiveMinutes: 0, oneHour: 0, assumed: false };
  const split = main?.cacheCreation5mInputTokens != null && main.cacheCreation1hInputTokens != null
    ? safeSum(main.cacheCreation5mInputTokens, main.cacheCreation1hInputTokens) : null;
  if (main?.inputTokens === delta.inputTokens && main?.outputTokens === delta.outputTokens &&
    main?.cacheReadInputTokens === delta.cacheReadInputTokens &&
    main?.cacheCreationInputTokens === delta.cacheCreationInputTokens && split === delta.cacheCreationInputTokens) {
    return { fiveMinutes: main.cacheCreation5mInputTokens!, oneHour: main.cacheCreation1hInputTokens!, assumed: false };
  }
  return { fiveMinutes: 0, oneHour: delta.cacheCreationInputTokens, assumed: true };
};

const publicPayload = (payload: TokenUsageUpdatedPayload, tokens: Counts | null, flags: string[]): TokenUsageUpdatedPayload => {
  const gross = tokens ? safeSum(tokens.inputTokens, tokens.cacheReadInputTokens, tokens.cacheCreationInputTokens) : null;
  const total = gross !== null && tokens ? safeSum(gross, tokens.outputTokens) : null;
  if (tokens && (gross === null || total === null)) {
    return publicPayload(payload, null, flagsWith(flags, 'claude_sdk_selected_safeint_exceeded'));
  }
  const split = tokens ? selectedCacheSplit(payload.claude_sdk_main_loop_usage, tokens) : null;
  if (split?.assumed) flags = flagsWith(flags, 'claude_sdk_cache_write_1h_assumed');
  return {
    ...payload,
    claude_sdk_model_usage: [], // all-source checkpoints are private to this fold
    claude_sdk_main_loop_usage: null,
    raw_event_json: null,
    raw_usage_json: null,
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
    cache_creation_5m_input_tokens: split?.fiveMinutes ?? null,
    cache_creation_1h_input_tokens: split?.oneHour ?? null,
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

export const reconcileClaudeSdkResult = (input: {
  record: TokenUsageRunRecord;
  payload: TokenUsageUpdatedPayload;
}): { record: TokenUsageRunRecord; payload: TokenUsageUpdatedPayload } => {
  const { payload } = input;
  let state = decodeState(input.record.claudeSdkUsageStateJson);
  let flags = [...payload.quality_flags];
  if (input.record.claudeSdkUsageStateJson !== null && state === null) flags = flagsWith(flags, 'claude_sdk_checkpoint_invalid');
  if (state === null) state = emptyState();
  if (input.record.usageReportCount > 0n && input.record.claudeSdkUsageStateJson === null) {
    state.partial = true;
    flags = flagsWith(flags, 'claude_sdk_prior_policy_history_unattributed');
  }
  const sessionId = payload.claude_sdk_session_id;
  const rows = payload.claude_sdk_model_usage ?? [];
  if (!sessionId || payload.quality_flags.includes('claude_sdk_identity_invalid') || !payload.selected_model_value) {
    state.partial = true;
    state.latestSelectedRawModelId = null;
    flags = flagsWith(flags, 'claude_sdk_selected_source_unusable');
    return { record: { ...input.record, claudeSdkUsageStateJson: JSON.stringify(state) },
      payload: publicPayload(payload, null, flags) };
  }
  const knownSession = state.checkpoints.some((row) => row.sessionId === sessionId);
  // SR-012: a resume-opened process restarts cumulative totals from an unknown origin. Its first
  // observation re-anchors every checkpoint and admits the per-turn main-loop usage instead.
  const seriesRestart = payload.claude_sdk_series_restart === true;
  const zeroOrigin = payload.claude_sdk_query_kind === 'create' || knownSession;
  let selectedTokens: Counts | null = null;
  const next = structuredClone(state);
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
    const mayContribute = seriesRestart || (!regressed && Boolean(previous || zeroOrigin));
    // A regression is a reset baseline: suppress this row, then advance from it once.
    if (index >= 0) next.checkpoints[index] = current;
    else next.checkpoints.push(current);
    if (row.rawModelId !== payload.selected_resolved_raw_model_id || payload.selected_match_state !== 'matched') continue;
    if (!mayContribute) {
      next.partial = true;
      flags = flagsWith(flags, regressed ? 'claude_sdk_selected_regressed' : 'claude_sdk_selected_legacy_resume_baselined');
      continue;
    }
    if (seriesRestart) {
      const mainLoop = payload.claude_sdk_main_loop_usage;
      if (!mainLoop || !fields.every((field) => typeof mainLoop[field] === 'number')) {
        next.partial = true;
        flags = flagsWith(flags, 'claude_sdk_series_restart_main_loop_unavailable');
        continue;
      }
      selectedTokens = Object.fromEntries(fields.map((field) => [field, mainLoop[field]!])) as Counts;
      flags = flagsWith(flags, 'claude_sdk_series_restart_main_loop_delta');
    } else {
      selectedTokens = Object.fromEntries(fields.map((field) =>
        [field, row[field] - (previous?.[field] ?? 0)])) as Counts;
    }
    const detailIndex = next.selectedDetails.findIndex((detail) => detail.rawModelId === row.rawModelId && detail.provider === row.provider);
    const oldDetail = detailIndex >= 0 ? next.selectedDetails[detailIndex]! : null;
    const detailCounts = fields.map((field) => safeSum(oldDetail?.[field] ?? 0, selectedTokens![field]));
    if (detailCounts.some((count) => count === null)) {
      next.partial = true;
      flags = flagsWith(flags, 'claude_sdk_selected_safeint_exceeded');
      selectedTokens = null;
      continue;
    }
    const detail: ClaudeSdkModelUsage = {
      ...row, canonicalModel: current.canonicalModel,
      inputTokens: detailCounts[0]!, outputTokens: detailCounts[1]!,
      cacheReadInputTokens: detailCounts[2]!, cacheCreationInputTokens: detailCounts[3]!,
    };
    if (detailIndex >= 0) next.selectedDetails[detailIndex] = detail;
    else next.selectedDetails.push(detail);
  }
  if (payload.selected_match_state !== 'matched') {
    next.partial = true;
    flags = flagsWith(flags, 'claude_sdk_selected_model_missing');
  }
  const encoded = JSON.stringify(next);
  if (Buffer.byteLength(encoded) > MAX_STATE_BYTES) {
    flags = flagsWith(flags, 'claude_sdk_checkpoint_capacity_exceeded');
    return { record: input.record, payload: publicPayload(payload, null, flags) };
  }
  return { record: { ...input.record, claudeSdkUsageStateJson: encoded },
    payload: publicPayload(payload, selectedTokens, flags) };
};

export const selectedClaudeSdkDetailsFromState = (raw: string | null): ClaudeSdkModelUsage[] =>
  decodeState(raw)?.selectedDetails ?? [];

export const latestSelectedClaudeSdkRawIdFromState = (raw: string | null): string | null =>
  decodeState(raw)?.latestSelectedRawModelId ?? null;
