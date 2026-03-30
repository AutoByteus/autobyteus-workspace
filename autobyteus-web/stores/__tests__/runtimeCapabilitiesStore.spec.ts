import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

describe('runtimeAvailabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads runtime capability metadata and exposes enablement getters', async () => {
    (getApolloClient as any).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        data: {
          runtimeAvailabilities: [
            { runtimeKind: 'autobyteus', enabled: true, reason: null },
            { runtimeKind: 'codex_app_server', enabled: false, reason: 'Codex CLI is not available on PATH.' },
            { runtimeKind: 'claude_agent_sdk', enabled: true, reason: null },
          ],
        },
      }),
    });

    const store = useRuntimeAvailabilityStore();
    await store.fetchRuntimeAvailabilities();

    expect(store.isRuntimeEnabled('autobyteus')).toBe(true);
    expect(store.isRuntimeEnabled('codex_app_server')).toBe(false);
    expect(store.isRuntimeEnabled('claude_agent_sdk')).toBe(true);
    expect(store.runtimeReason('codex_app_server')).toContain('Codex CLI is not available');
  });
});
