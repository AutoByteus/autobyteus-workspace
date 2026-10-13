import { reactive } from 'vue';
import type {
  TokenUsageRunSummary,
  TokenUsageThroughputIdentity,
  TokenUsageThroughputState,
  TokenUsageUpdatedPayload,
} from '~/types/tokenUsageMeter';

type LiveReport = Pick<TokenUsageUpdatedPayload,
  'usage_event_id' | 'idempotency_key' | 'observed_at' | 'reports_model_call' | 'turn_id'
  | 'runtime_kind' | 'model_provider' | 'model_identifier' | 'model_value'
  | 'meter_delta_output_tokens' | 'quality_flags'>;
type Baseline = {
  identity: TokenUsageThroughputIdentity;
  observedMs: number;
  callCount: number;
};
type Entry = {
  revision: number;
  latestObservedMs: number;
  baseline: Baseline | null;
  state: TokenUsageThroughputState;
};

const outputInvalidFlags = new Set([
  'reported_output_tokens_missing', 'output_tokens_missing', 'snapshot_series_key_missing',
  'cumulative_snapshot_source_unrecoverable', 'cumulative_snapshot_regressed',
  'cumulative_series_checkpoint_evicted', 'token_usage_persistence_unavailable',
  'token_usage_public_summary_unavailable',
]);
const text = (value: string | null | undefined): string | null => value?.trim() || null;
const sameIdentity = (a: TokenUsageThroughputIdentity, b: TokenUsageThroughputIdentity): boolean => (
  a.runId === b.runId && a.turnId === b.turnId && a.runtimeKind === b.runtimeKind
  && a.modelProvider === b.modelProvider && a.modelIdentifier === b.modelIdentifier && a.modelValue === b.modelValue
);

/** Meter-private, session-local report pairs. No accounting, timers or historical backfill. */
export const createTokenUsageThroughput = () => {
  const entries = reactive<Record<string, Entry>>({});

  function getRunThroughput(runId: string | null | undefined): TokenUsageThroughputState | null {
    return runId ? entries[runId.trim()]?.state ?? null : null;
  }

  function invalidate(entry: Entry, reason: Extract<TokenUsageThroughputState, { status: 'unavailable' }>['reason']): void {
    entry.baseline = null;
    entry.state = { status: 'unavailable', reason };
  }

  /** A known later unsaved call must not let the next saved call bridge an evidence hole. */
  function observeMissingSummary(runId: string, report: LiveReport): void {
    const entry = entries[runId];
    const observedMs = Date.parse(report.observed_at ?? '');
    if (!entry || report.reports_model_call !== true || !(report.usage_event_id || report.idempotency_key)
      || !Number.isFinite(observedMs) || observedMs <= entry.latestObservedMs) return;
    entry.latestObservedMs = observedMs;
    invalidate(entry, 'missingSummary');
  }

  /** Called only when the meter admits an advancing, identity-validated live exact summary. */
  function observe(runId: string, report: LiveReport, summary: Pick<TokenUsageRunSummary, 'revision' | 'usageReportCount' | 'latestRuntimeKind'>): void {
    let entry = entries[runId];
    if (entry && summary.revision <= entry.revision) return;
    if (!entry) {
      entries[runId] = { revision: summary.revision, latestObservedMs: -Infinity, baseline: null,
        state: { status: 'collecting', reason: 'waitingForReports' } };
      entry = entries[runId]!;
    } else if (summary.revision !== entry.revision + 1) {
      entry.baseline = null;
      entry.state = { status: 'collecting', reason: 'continuity' };
    }
    entry.revision = summary.revision;
    const observedMs = Date.parse(report.observed_at ?? '');
    if (Number.isFinite(observedMs)) entry.latestObservedMs = Math.max(entry.latestObservedMs, observedMs);
    // Context readings and Claude SDK reconciliation keep the call baseline and reading intact.
    if (report.reports_model_call !== true) return;

    const turnId = text(report.turn_id);
    const summaryRuntime = text(summary.latestRuntimeKind);
    const reportedRuntime = text(report.runtime_kind);
    const runtimeKind = reportedRuntime ?? summaryRuntime;
    const modelIdentifier = text(report.model_identifier);
    const modelValue = text(report.model_value);
    const outputTokens = report.meter_delta_output_tokens;
    if (!turnId || !runtimeKind || (!modelIdentifier && !modelValue)
      || (reportedRuntime && summaryRuntime && reportedRuntime !== summaryRuntime)
      || !Number.isFinite(observedMs) || !Number.isSafeInteger(outputTokens) || outputTokens! < 0
      || !Number.isSafeInteger(summary.usageReportCount) || summary.usageReportCount < 1
      || report.quality_flags?.some((flag) => outputInvalidFlags.has(flag))) {
      invalidate(entry, 'invalidReport');
      return;
    }
    const identity: TokenUsageThroughputIdentity = {
      runId, turnId, runtimeKind, modelIdentifier, modelValue, modelProvider: text(report.model_provider),
    };
    const next: Baseline = { identity, observedMs, callCount: summary.usageReportCount };
    const previous = entry.baseline;
    if (!previous || !sameIdentity(previous.identity, identity)
      || next.callCount !== previous.callCount + 1
      || report.quality_flags?.includes('cumulative_snapshot_provider_delta_missing')) {
      entry.baseline = next;
      entry.state = { status: 'collecting', reason: 'matchingReport' };
      return;
    }
    const elapsedSeconds = (observedMs - previous.observedMs) / 1000;
    const tokensPerSecond = outputTokens! / elapsedSeconds;
    if (elapsedSeconds <= 0 || !Number.isFinite(tokensPerSecond)) {
      invalidate(entry, 'invalidInterval');
      return;
    }
    entry.baseline = next;
    entry.state = {
      status: 'ready', identity, observedAt: report.observed_at!,
      outputTokens: outputTokens!, elapsedSeconds, tokensPerSecond,
    };
  }

  return { getRunThroughput, observe, observeMissingSummary };
};
