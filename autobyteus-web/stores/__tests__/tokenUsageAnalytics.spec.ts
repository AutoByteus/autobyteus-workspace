import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { analyticsResult } from '~/components/settings/token-usage/analytics/__tests__/tokenUsageAnalyticsTestFixtures';
import { rangeDatesForPreset, useTokenUsageAnalyticsStore } from '../tokenUsageAnalytics';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('tokenUsageAnalytics store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T19:25:00.000Z'));
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('creates exact inclusive UTC preset dates and sends one coherent half-open filtered request', async () => {
    expect(rangeDatesForPreset('THIS_MONTH')).toEqual({ startDate: '2026-08-01', endDate: '2026-08-22' });
    expect(rangeDatesForPreset('LAST_MONTH')).toEqual({ startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(rangeDatesForPreset('LAST_3_MONTHS')).toEqual({ startDate: '2026-06-01', endDate: '2026-08-22' });
    expect(rangeDatesForPreset('LAST_12_MONTHS')).toEqual({ startDate: '2025-09-01', endDate: '2026-08-22' });

    const result = analyticsResult({
      filterOptions: {
        runtimeKinds: ['codex_app_server'],
        providers: [{ key: 'provider-key', modelProvider: 'OPENAI', providerName: 'OpenAI', displayName: 'OpenAI' }],
        models: [{ key: 'model-key', modelIdentifier: 'gpt', modelValue: null, displayName: 'gpt' }],
      },
    } as any);
    const query = vi.fn().mockResolvedValue({ data: { tokenUsageAnalytics: result } });
    vi.mocked(getApolloClient).mockReturnValue({ query } as any);
    const store = useTokenUsageAnalyticsStore();
    store.selection.runtimeKind = 'codex_app_server';
    store.selection.providerKey = 'provider-key';
    store.selection.modelKey = 'model-key';

    await store.fetch();

    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      fetchPolicy: 'network-only',
      variables: { input: {
        rangePreset: 'THIS_MONTH',
        startTime: '2026-08-01T00:00:00.000Z',
        endTimeExclusive: '2026-08-23T00:00:00.000Z',
        runtimeKind: 'codex_app_server',
        providerKey: 'provider-key',
        modelKey: 'model-key',
      } },
    }));
    expect(store.result).toStrictEqual(result);
    expect(store.filterOptions).toEqual(result.filterOptions);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('hides a stale result while loading and never lets an older response overwrite the latest selection', async () => {
    const first = deferred<any>();
    const second = deferred<any>();
    const query = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.mocked(getApolloClient).mockReturnValue({ query } as any);
    const store = useTokenUsageAnalyticsStore();
    store.result = analyticsResult({ appliedFilters: { runtimeKind: 'old', providerKey: null, modelKey: null } } as any);
    store.selection.runtimeKind = 'codex_app_server';

    const olderFetch = store.fetch();
    expect(store.result).toBeNull();
    expect(store.loading).toBe(true);
    store.selection.runtimeKind = 'claude_agent_sdk';
    const latestFetch = store.fetch();

    const latestResult = analyticsResult({
      appliedFilters: { runtimeKind: 'claude_agent_sdk', providerKey: null, modelKey: null },
      filterOptions: { runtimeKinds: ['claude_agent_sdk'], providers: [], models: [] },
    } as any);
    second.resolve({ data: { tokenUsageAnalytics: latestResult } });
    await latestFetch;
    expect(store.result).toStrictEqual(latestResult);
    expect(store.loading).toBe(false);

    const staleResult = analyticsResult({
      appliedFilters: { runtimeKind: 'codex_app_server', providerKey: null, modelKey: null },
      filterOptions: { runtimeKinds: ['codex_app_server'], providers: [], models: [] },
    } as any);
    first.resolve({ data: { tokenUsageAnalytics: staleResult } });
    await olderFetch;

    expect(store.result).toStrictEqual(latestResult);
    expect(store.filterOptions.runtimeKinds).toEqual(['claude_agent_sdk']);
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('surfaces the current request error, keeps stale values hidden, and leaves retry-ready state', async () => {
    const query = vi.fn().mockRejectedValue(new Error('analytics query failed'));
    vi.mocked(getApolloClient).mockReturnValue({ query } as any);
    const store = useTokenUsageAnalyticsStore();
    store.result = analyticsResult();

    await expect(store.fetch()).rejects.toThrow('analytics query failed');

    expect(store.result).toBeNull();
    expect(store.error).toBe('analytics query failed');
    expect(store.loading).toBe(false);
  });
});
