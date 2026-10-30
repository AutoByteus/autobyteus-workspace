import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { gql } from '@apollo/client/core';
import {
  BOUND_APOLLO_CLIENT_KEY,
  buildBoundApolloClient,
  registerBoundApolloClient,
} from '../30.apollo.client';
import { useUiErrorStore } from '~/stores/uiErrorStore';

describe('30.apollo.client plugin helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('binds the client to the Nuxt app under its one key', () => {
    const client = buildBoundApolloClient('http://127.0.0.1:8000/graphql');
    const nuxtApp: Record<string, unknown> = {};

    registerBoundApolloClient(nuxtApp, client);

    expect(nuxtApp).toEqual({ [BOUND_APOLLO_CLIENT_KEY]: client });
  });

  it('uses provided endpoint and surfaces network errors through uiErrorStore', async () => {
    const uiErrorStore = useUiErrorStore();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const client = buildBoundApolloClient('http://127.0.0.1:8010/graphql');

    await expect(
      client.query({
        query: gql`
          query TestHealth {
            health
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toBeTruthy();

    expect(fetchMock).toHaveBeenCalled();
    expect(uiErrorStore.errors.length).toBeGreaterThan(0);
    expect(uiErrorStore.errors[0].source).toBe('apollo');
  });
});

