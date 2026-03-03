import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const { mockRuntimeConfig, apolloClientMock } = vi.hoisted(() => ({
  mockRuntimeConfig: {
    public: {
      enableApplications: false,
    },
  },
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}));

mockNuxtImport('useRuntimeConfig', () => () => mockRuntimeConfig);

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}));

vi.mock('~/graphql/queries/applicationQueries', () => ({
  ListApplications: {},
}));

vi.mock('~/graphql/mutations/applicationMutations', () => ({
  RunApplication: {},
}));

// Now import the store and other things
import { useApplicationStore } from '../applicationStore';

describe('applicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRuntimeConfig.public.enableApplications = false;
  });

  describe('fetchApplications', () => {
    it('does nothing if enableApplications is false', async () => {
      const store = useApplicationStore();

      await store.fetchApplications();

      expect(apolloClientMock.query).not.toHaveBeenCalled();
      expect(store.applications).toEqual([]);
      expect(store.loading).toBe(false);
    });

    it('fetches applications if enableApplications is true', async () => {
      mockRuntimeConfig.public.enableApplications = true;
      const store = useApplicationStore();
      const mockData = { data: { listApplications: [{ id: 'app1', name: 'App 1' }] } };
      apolloClientMock.query.mockResolvedValue(mockData);

      await store.fetchApplications();

      expect(apolloClientMock.query).toHaveBeenCalled();
      expect(store.applications).toEqual(mockData.data.listApplications);
      expect(store.loading).toBe(false);
    });
  });

  describe('runApplication', () => {
    it('throws error if enableApplications is false', async () => {
      const store = useApplicationStore();

      await expect(store.runApplication('app1', {})).rejects.toThrow('Applications feature is disabled');
      expect(apolloClientMock.mutate).not.toHaveBeenCalled();
    });

    it('runs application if enableApplications is true', async () => {
      mockRuntimeConfig.public.enableApplications = true;
      const store = useApplicationStore();
      const mockData = { data: { runApplication: { id: 'run1' } } };
      apolloClientMock.mutate.mockResolvedValue(mockData);

      const result = await store.runApplication('app1', { foo: 'bar' });

      expect(apolloClientMock.mutate).toHaveBeenCalled();
      expect(result).toEqual(mockData.data.runApplication);
      expect(store.lastRunResult).toEqual(mockData.data.runApplication);
    });
  });
});
