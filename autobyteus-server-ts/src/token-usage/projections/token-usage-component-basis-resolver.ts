import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { resolveTokenUsageComponentBasis } from "../domain/token-usage-component-basis.js";

export class TokenUsageComponentBasisResolver {
  resolve(payload: TokenUsageUpdatedPayload): TokenUsageUpdatedPayload {
    const qualityFlags = new Set(payload.quality_flags);
    const basis = resolveTokenUsageComponentBasis(payload);
    for (const flag of basis.quality_flags) qualityFlags.add(flag);

    return {
      ...payload,
      accounting_input_tokens: basis.accounting_input_tokens,
      accounting_output_tokens: basis.accounting_output_tokens,
      accounting_total_tokens: basis.accounting_total_tokens,
      standard_input_tokens: basis.standard_input_tokens,
      cache_miss_input_tokens: basis.cache_miss_input_tokens,
      cache_creation_input_tokens: basis.cache_creation_input_tokens,
      cache_state: basis.cache_state,
      billable_output_tokens: basis.billable_output_tokens,
      billable_input_tokens: basis.billable_input_tokens,
      quality_flags: Array.from(qualityFlags),
    };
  }
}
