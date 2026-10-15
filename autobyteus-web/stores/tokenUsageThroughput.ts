import { reactive } from 'vue';
import type { TokenUsageTps, TokenUsageUpdatedPayload } from '~/types/tokenUsageMeter';

type ModelCallReport = Pick<TokenUsageUpdatedPayload, 'output_throughput' | 'model_identifier' | 'model_value'>;

const text = (value: string | null | undefined): string | null => value?.trim() || null;

/**
 * Meter-private, session-local newest TPS per exact AgentRun. The server decides each model
 * call's TPS; a report without one leaves the shown value unchanged. Nothing is kept on reload.
 */
export const createTokenUsageThroughput = () => {
  const latest = reactive<Record<string, TokenUsageTps>>({});

  function getRunTps(runId: string | null | undefined): TokenUsageTps | null {
    return runId ? latest[runId.trim()] ?? null : null;
  }

  function record(runId: string, report: ModelCallReport): void {
    const value = report.output_throughput;
    if (!value) return;
    latest[runId] = {
      method: value.method,
      outputTokens: value.output_tokens,
      durationMs: value.duration_ms,
      model: text(report.model_identifier) ?? text(report.model_value),
    };
  }

  return { getRunTps, record };
};
