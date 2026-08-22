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

  it('quotes commas, quotes, and newlines while preserving exact range, filters, grouping, and filename', () => {
    const result = analyticsResult({
      appliedRange: {
        preset: 'CUSTOM',
        startTime: '2026-08-01T00:00:00.000Z',
        endTimeExclusive: '2026-08-23T00:00:00.000Z',
        granularity: 'DAY',
      },
      coverage: { status: 'PARTIAL', coverageStart: '2026-08-10T12:34:56.000Z' },
      appliedFilters: {
        runtimeKind: 'codex_app_server',
        providerKey: 'v1:provider',
        modelKey: 'v1:model',
      },
      breakdownRows: [{
        rowKey: 'row,"one"', identityKey: 'identity', providerKey: 'v1:provider', modelKey: 'v1:model',
        runtimeKind: 'codex_app_server', modelProvider: 'OPENAI', providerName: 'OpenAI, "Primary"',
        providerDisplayName: 'OpenAI, "Primary"', modelIdentifier: 'gpt\nmodel', modelValue: null,
        modelDisplayName: 'gpt\nmodel',
        aggregate: aggregate({
          grossInputTokens: 1_000,
          standardInputTokens: 200,
          cacheReadInputTokens: 800,
          outputTokens: 200,
          reasoningOutputTokens: 100,
          totalTokens: 1_200,
          estimatedApiTotalCost: 1.2,
          currency: 'USD',
          apiCostStatus: 'partial_price_missing',
          missingPriceDimensions: ['cache,write', 'output"price'],
          usageReportCount: 3,
        }),
        costQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: ['cache,write', 'output"price'] },
      }],
    } as any);

    const { csv, filename } = serializeTokenUsageAnalyticsCsv(result, 'PROVIDER');

    expect(filename).toBe('token-usage-analytics_2026-08-01_2026-08-22.csv');
    expect(csv).toContain('"2026-08-01T00:00:00.000Z","2026-08-23T00:00:00.000Z","2026-08-10T12:34:56.000Z","PARTIAL","PROVIDER"');
    expect(csv).toContain('"codex_app_server","v1:provider","v1:model"');
    expect(csv).toContain('"row,""one"""');
    expect(csv).toContain('"OpenAI, ""Primary"""');
    expect(csv).toContain('"gpt\nmodel"');
    expect(csv).toContain('"partial_price_missing","PARTIAL","cache,write|output""price","3"');
    expect(csv.endsWith('\r\n')).toBe(false);
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
