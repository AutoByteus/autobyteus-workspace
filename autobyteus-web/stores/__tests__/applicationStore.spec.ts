import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}));

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
  });

  describe('fetchApplications', () => {
    it('fetches applications from the API', async () => {
      const store = useApplicationStore();
      const mockData = { data: { listApplications: [{ id: 'app1', name: 'App 1' }] } };
      apolloClientMock.query.mockResolvedValue(mockData);

      await store.fetchApplications();

      expect(apolloClientMock.query).toHaveBeenCalledOnce();
      expect(store.applications).toEqual(mockData.data.listApplications);
      expect(store.loading).toBe(false);
    });

    it('does not re-fetch when applications are already loaded', async () => {
      const store = useApplicationStore();
      store.applications = [{ id: 'app1', name: 'App 1' }] as any;

      await store.fetchApplications();

      expect(apolloClientMock.query).not.toHaveBeenCalled();
      expect(store.loading).toBe(false);
    });
  });

  describe('runApplication', () => {
    it('throws when mutation fails', async () => {
      const store = useApplicationStore();
      apolloClientMock.mutate.mockRejectedValue(new Error('mutation failed'));

      await expect(store.runApplication('app1', {})).rejects.toThrow('mutation failed');
      expect(apolloClientMock.mutate).toHaveBeenCalledOnce();
    });

    it('runs application when mutation succeeds', async () => {
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
