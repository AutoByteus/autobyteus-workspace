import { describe, expect, it } from 'vitest';
import { serializeTokenUsageAnalyticsCsv } from '../tokenUsageAnalyticsCsv';
import { aggregate, analyticsResult } from '../../components/settings/token-usage/analytics/__tests__/tokenUsageAnalyticsTestFixtures';

describe('serializeTokenUsageAnalyticsCsv', () => {
  it('exports captured API cost status separately from derived cost quality', () => {
    const result = analyticsResult({
      breakdownRows: [{
        rowKey: 'local', identityKey: 'identity-local', providerKey: 'provider-local', modelKey: 'model-local',
        runtimeKind: 'autobyteus', modelProvider: 'ollama', providerName: 'Ollama', providerDisplayName: 'Ollama',
        modelIdentifier: 'qwen', modelValue: 'qwen', modelDisplayName: 'qwen',
        aggregate: aggregate({ totalTokens: 25, estimatedApiTotalCost: 0, currency: null, apiCostStatus: 'local_no_api_bill' }),
        costQuality: { kind: 'LOCAL', currency: null, missingPriceDimensions: [] },
      }],
    } as any);

    const { csv, filename } = serializeTokenUsageAnalyticsCsv(result, 'RUNTIME_MODEL');
    const [header, row] = csv.split('\r\n').map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '')));

    expect(header).toContain('captured_api_cost_status');
    expect(header).toContain('derived_cost_quality');
    expect(header).not.toContain('cost_status');
    expect(row?.[header!.indexOf('captured_api_cost_status')]).toBe('local_no_api_bill');
    expect(row?.[header!.indexOf('derived_cost_quality')]).toBe('LOCAL');
    expect(row?.[header!.indexOf('currency')]).toBe('');
    expect(filename).toBe('token-usage-analytics_2026-01-31_2026-08-31.csv');
  });
});
