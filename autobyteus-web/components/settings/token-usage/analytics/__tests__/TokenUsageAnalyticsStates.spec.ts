import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import TokenUsageAnalyticsControls from '../TokenUsageAnalyticsControls.vue';
import TokenUsageAnalyticsView from '../TokenUsageAnalyticsView.vue';
import { aggregate, analyticsResult } from './tokenUsageAnalyticsTestFixtures';

const { storeSlot, messages, download } = vi.hoisted(() => ({
  storeSlot: { store: null as any },
  download: vi.fn(),
  messages: {
    controls: 'Analytics controls', thisMonth: 'This month', lastMonth: 'Last month', last3Months: 'Last 3 months',
    last12Months: 'Last 12 months', custom: 'Custom', startDate: 'Start date', endDate: 'End date', apply: 'Apply',
    runtime: 'Runtime', provider: 'Provider', model: 'Model', all: 'All', metric: 'Metric', tokens: 'Tokens',
    estimatedCost: 'Estimated cost', filtersActive: 'Filters active', allUsage: 'All usage', clearFilters: 'Clear filters',
    exportCsv: 'Export CSV', chooseBothDates: 'Choose both dates to apply a custom range.',
    invalidDateOrder: 'Choose a start date on or before the end date.', loading: 'Loading analytics', loaded: 'Analytics loaded',
    retry: 'Retry', unavailableEmpty: 'Earlier analytics are unavailable.', noTrackedUsage: 'No tracked token usage in this period.',
    widenOrClear: 'Try a wider range or clear filters.', fullCoverage: 'Full analytics coverage',
    partialCoverage: 'Partial coverage', unavailableCoverage: 'Analytics unavailable', trackingSince: 'Tracking since {date}',
    unavailableDetail: 'Earlier monthly usage cannot be reconstructed; tracking began {date}.',
    mixedCurrencies: 'Multiple currencies cannot be combined.', partialPricing: 'Some usage is unpriced.',
    missingPricing: 'Pricing is missing.', localUsage: 'Local usage has no API bill.', notInvoice: 'Not a provider invoice.',
    summary: 'Analytics summary', totalTokens: 'Total tokens', estimatedApiCost: 'Estimated API cost',
    tokensPerActiveDay: 'Tokens per active day', comparedPrior: 'Compared with prior period', input: 'input', output: 'output',
    qualityCOMPLETE: 'Complete estimate', qualityNO_USAGE: 'No usage', qualityPARTIAL: 'Partial estimate',
    activeDays: 'active days', prior: 'Prior', noComparableData: 'No comparable data',
    comparisonUnavailable: 'Comparison unavailable', notAvailable: 'Not available', mixed: 'Mixed', localNoBill: 'Local · no API bill',
  } as Record<string, string>,
}));

vi.mock('~/stores/tokenUsageAnalytics', () => ({
  useTokenUsageAnalyticsStore: () => storeSlot.store,
}));
vi.mock('~/utils/tokenUsageAnalyticsCsv', () => ({
  downloadTokenUsageAnalyticsCsv: download,
}));
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = messages[key.split('.').pop() ?? key] ?? key;
      return Object.entries(params ?? {}).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, String(value)).replace(`{{${name}}}`, String(value)),
        template,
      );
    },
  }),
}));

const createStore = (overrides: Record<string, unknown> = {}) => {
  const store: any = reactive({
    selection: {
      rangePreset: 'THIS_MONTH', startDate: '2026-08-01', endDate: '2026-08-22',
      runtimeKind: null, providerKey: null, modelKey: null,
    },
    result: null,
    loading: false,
    error: null,
    filterOptions: {
      runtimeKinds: ['codex_app_server'],
      providers: [{ key: 'provider-key', displayName: 'OpenAI' }],
      models: [{ key: 'model-key', displayName: 'gpt-5.6-sol' }],
    },
    fetch: vi.fn(async () => undefined),
    setPreset: vi.fn((preset: string) => { store.selection.rangePreset = preset; }),
    clearFilters: vi.fn(() => {
      store.selection.runtimeKind = null;
      store.selection.providerKey = null;
      store.selection.modelKey = null;
    }),
    ...overrides,
  });
  return store;
};

const viewStubs = {
  TokenUsageAnalyticsControls: { template: '<section data-test="controls">controls</section>' },
  TokenUsageTrendChart: { template: '<section data-test="trend">trend</section>' },
  TokenUsagePaceChart: { template: '<section data-test="pace">pace</section>' },
  TokenUsageBreakdown: { template: '<section data-test="breakdown">breakdown</section>' },
};

describe('TokenUsageAnalytics controls and coherent states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeSlot.store = createStore();
  });

  it('uses labeled button/radio controls, validates Custom inline, and preserves selection on metric switch', async () => {
    const wrapper = mount(TokenUsageAnalyticsControls, { props: { metric: 'TOKENS' } });

    expect(wrapper.get('section').attributes('aria-label')).toBe('Analytics controls');
    expect(wrapper.text()).toContain('UTC');
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]!.attributes('aria-checked')).toBe('true');
    expect(radios[1]!.attributes('aria-checked')).toBe('false');

    const originalSelection = { ...storeSlot.store.selection };
    await radios[1]!.trigger('click');
    expect(wrapper.emitted('update:metric')).toEqual([['COST']]);
    expect(storeSlot.store.selection).toMatchObject(originalSelection);

    const custom = wrapper.findAll('button').find((button) => button.text() === 'Custom')!;
    await custom.trigger('click');
    expect(storeSlot.store.setPreset).toHaveBeenCalledWith('CUSTOM');
    storeSlot.store.selection.startDate = '2026-08-23';
    storeSlot.store.selection.endDate = '2026-08-22';
    await nextTick();

    expect(wrapper.get('[role="alert"]').text()).toBe('Choose a start date on or before the end date.');
    const apply = wrapper.findAll('button').find((button) => button.text() === 'Apply')!;
    expect(apply.attributes()).toHaveProperty('disabled');

    storeSlot.store.selection.startDate = '2026-08-01';
    await nextTick();
    await apply.trigger('click');
    expect(storeSlot.store.fetch).toHaveBeenCalledTimes(1);
  });

  it('hides result surfaces while loading and exposes an announced retryable error', async () => {
    storeSlot.store = createStore({ loading: true });
    const loading = mount(TokenUsageAnalyticsView, { global: { stubs: viewStubs } });
    expect(loading.get('[aria-busy="true"]').exists()).toBe(true);
    expect(loading.find('[data-test="trend"]').exists()).toBe(false);
    expect(loading.text()).toContain('Loading analytics');

    storeSlot.store = createStore({ error: 'analytics query failed' });
    const error = mount(TokenUsageAnalyticsView, { global: { stubs: viewStubs } });
    expect(error.get('[role="alert"]').text()).toContain('analytics query failed');
    await error.get('button').trigger('click');
    expect(storeSlot.store.fetch).toHaveBeenCalledTimes(2); // mount retry plus explicit Retry
  });

  it('distinguishes unavailable, covered-empty, and populated partial states without mixing surfaces', () => {
    storeSlot.store = createStore({
      result: analyticsResult({
        coverage: { status: 'UNAVAILABLE', coverageStart: '2026-08-10T12:00:00.000Z' },
        selectedAggregate: aggregate(),
      } as any),
    });
    const unavailable = mount(TokenUsageAnalyticsView, { global: { stubs: viewStubs } });
    expect(unavailable.text()).toContain('Analytics unavailable');
    expect(unavailable.text()).toContain('Earlier monthly usage cannot be reconstructed');
    expect(unavailable.text()).toContain('Earlier analytics are unavailable.');
    expect(unavailable.find('[data-test="trend"]').exists()).toBe(false);

    storeSlot.store = createStore({
      result: analyticsResult({ selectedAggregate: aggregate(), selectedCostQuality: { kind: 'NO_USAGE', currency: null, missingPriceDimensions: [] } } as any),
    });
    const empty = mount(TokenUsageAnalyticsView, { global: { stubs: viewStubs } });
    expect(empty.text()).toContain('No tracked token usage in this period.');
    expect(empty.find('[data-test="trend"]').exists()).toBe(false);

    storeSlot.store = createStore({
      result: analyticsResult({
        coverage: { status: 'PARTIAL', coverageStart: '2026-08-10T12:00:00.000Z' },
        selectedAggregate: aggregate({ totalTokens: 100, grossInputTokens: 80, outputTokens: 20, usageReportCount: 1 }),
        selectedCostQuality: { kind: 'PARTIAL', currency: 'USD', missingPriceDimensions: ['output'] },
      } as any),
    });
    const populated = mount(TokenUsageAnalyticsView, { global: { stubs: viewStubs } });
    expect(populated.text()).toContain('Partial coverage');
    expect(populated.text()).toContain('Some usage is unpriced.');
    expect(populated.find('[data-test="trend"]').exists()).toBe(true);
    expect(populated.find('[data-test="pace"]').exists()).toBe(true);
    expect(populated.find('[data-test="breakdown"]').exists()).toBe(true);
  });
});
