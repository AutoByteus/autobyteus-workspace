import { describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { buildClaudeTokenUsageEvent } from '../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenPriceConfigProvider } from '../../../../src/token-usage/pricing/token-price-config-provider.js';
import { foldTokenUsageObservation } from '../../../../src/token-usage/projections/token-usage-run-fold.js';
import { buildTokenUsageRunSummaryFromRecords } from '../../../../src/token-usage/projections/token-usage-run-aggregate.js';

describe('temporary Solution Designer statistics-path probe', () => {
  it('traces one SDK-shaped mixed result to the current run summary without provider/network access', async () => {
    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    LLMFactory.resetForTests();
    try {
      const event = buildClaudeTokenUsageEvent({
        chunk: {
          type:'result', usage:{input_tokens:2,output_tokens:65,cache_read_input_tokens:9617,cache_creation_input_tokens:7143},
          modelUsage:{
            'claude-haiku-4-5-20251001':{inputTokens:896,outputTokens:10,cacheReadInputTokens:0,cacheCreationInputTokens:0,costUSD:0.000946,canonicalModel:'claude-haiku-4-5',costBasis:'list'},
            'claude-opus-5-5[1m]':{inputTokens:2,outputTokens:65,cacheReadInputTokens:9617,cacheCreationInputTokens:7143,costUSD:0.0603754,canonicalModel:'claude-opus-5-5',costBasis:'list'},
          }, total_cost_usd:0.0613214,
        }, runId:'sdk-statistics-probe',turnId:'turn-1',sessionId:'session-1',model:'opus[1m]',
      });
      expect(event).not.toBeNull();
      const payload = createTokenUsageUpdatedPayload({runId:'sdk-statistics-probe',payload:event!.params as Record<string, unknown>,observedAt:'2026-09-23T00:00:00.000Z'});
      const policy = await new TokenPriceConfigProvider().resolvePolicy(payload);
      const folded = foldTokenUsageObservation({current:null,payload,pricingPolicy:policy});
      const summary = buildTokenUsageRunSummaryFromRecords({runId:'sdk-statistics-probe',records:folded.record ? [folded.record] : []});
      console.log(JSON.stringify({selected:'opus[1m]',event_model:payload.model_identifier,policy_status:policy.pricing_status,policy_missing_reason:policy.missing_reason,summary_model:summary.latest_model_identifier,summary_cost_status:summary.api_cost_status,summary_total_cost:summary.estimated_api_total_cost,summary_usage_reports:summary.usage_report_count,summary_input:summary.gross_input_tokens,summary_output:summary.output_tokens}));
      expect(summary.latest_model_identifier).toBe('claude-haiku-4-5-20251001');
      expect(summary.estimated_api_total_cost).toBeNull();
    } finally { vi.restoreAllMocks(); LLMFactory.resetForTests(); }
  });
});
