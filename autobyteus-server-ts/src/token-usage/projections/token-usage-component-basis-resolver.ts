import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { deriveCacheState, sumCacheCreationTokens } from "../domain/token-usage-component-basis.js";

const addNullable = (...values: Array<number | null | undefined>): number | null => {
  let sawValue = false;
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    sawValue = true;
    total += value;
  }
  return sawValue ? total : null;
};

const nonNegative = (value: number): number => Math.max(value, 0);

export class TokenUsageComponentBasisResolver {
  resolve(payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload {
    const qualityFlags = new Set(payload.quality_flags);
    const cacheCreationTokens = sumCacheCreationTokens(payload);
    const cacheReadTokens = payload.cache_read_input_tokens;
    const cacheMissTokens = payload.cache_miss_input_tokens;
    const reportedInputTokens = payload.reported_input_tokens;

    let grossInputTokens: number | null = payload.accounting_input_tokens;
    let standardInputTokens: number | null = payload.standard_input_tokens;

    if (payload.input_token_semantic === "gross_includes_cache") {
      grossInputTokens = reportedInputTokens;
      standardInputTokens = cacheMissTokens ?? (
        reportedInputTokens === null
          ? null
          : nonNegative(reportedInputTokens - (cacheReadTokens ?? 0) - (cacheCreationTokens ?? 0))
      );
    } else if (payload.input_token_semantic === "base_excludes_cache") {
      standardInputTokens = reportedInputTokens;
      grossInputTokens = reportedInputTokens === null
        ? null
        : reportedInputTokens + (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0);
    } else {
      grossInputTokens = reportedInputTokens;
      standardInputTokens = null;
      qualityFlags.add("input_token_semantic_unknown");
      if ((reportedInputTokens ?? 0) > 0) {
        qualityFlags.add("standard_input_tokens_unresolved");
      }
    }

    const billableOutputTokens = payload.billable_output_tokens ?? payload.reported_output_tokens;
    const accountingTotalTokens = grossInputTokens !== null && billableOutputTokens !== null
      ? grossInputTokens + billableOutputTokens
      : null;
    const cacheState = deriveCacheState({
      cacheState: payload.cache_state === "unknown" ? null : payload.cache_state,
      runtimeKind: payload.runtime_kind,
      cacheReadInputTokens: cacheReadTokens,
      cacheCreationInputTokens: cacheCreationTokens,
      cacheCreation5mInputTokens: payload.cache_creation_5m_input_tokens,
      cacheCreation1hInputTokens: payload.cache_creation_1h_input_tokens,
      cacheMissInputTokens: cacheMissTokens,
    });

    return {
      ...payload,
      accounting_input_tokens: grossInputTokens,
      accounting_output_tokens: billableOutputTokens,
      accounting_total_tokens: accountingTotalTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: cacheMissTokens ?? standardInputTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_state: cacheState,
      billable_output_tokens: billableOutputTokens,
      billable_input_tokens: grossInputTokens,
      quality_flags: Array.from(qualityFlags),
    };
  }
}
