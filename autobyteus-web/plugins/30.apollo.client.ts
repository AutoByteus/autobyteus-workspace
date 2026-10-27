import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, type NormalizedCacheObject } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { useUiErrorStore } from '~/stores/uiErrorStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { getRemoteAccessAuthHeaders } from '~/utils/remoteAccess/authorizedTransport';
import { resolveCurrentGraphqlHttpEndpoint } from '~/utils/remoteAccess/mobileSessionBootstrap';

export const BOUND_APOLLO_CLIENT_KEY = '__boundApolloClient';

export type NuxtAppLike = {
  [BOUND_APOLLO_CLIENT_KEY]?: ApolloClient<NormalizedCacheObject>;
};

// The binding registerBoundApolloClient writes, as the Nuxt app's own field (read by utils/apolloClient.ts).
declare module '#app' {
  interface NuxtApp {
    [BOUND_APOLLO_CLIENT_KEY]?: NuxtAppLike[typeof BOUND_APOLLO_CLIENT_KEY];
  }
}

export function buildBoundApolloClient(
  graphqlHttpEndpoint: string | (() => string),
): ApolloClient<NormalizedCacheObject> {
  const uiErrorStore = useUiErrorStore();
  const resolveGraphqlHttpEndpoint = typeof graphqlHttpEndpoint === 'function'
    ? graphqlHttpEndpoint
    : () => graphqlHttpEndpoint;

  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors && graphQLErrors.length > 0) {
      graphQLErrors.forEach((error) => {
        uiErrorStore.push(
          {
            message: error.message || 'GraphQL error',
            operation: operation?.operationName || 'unknown',
            path: error.path,
            extensions: error.extensions,
          },
          'apollo',
        );
      });
    }

    if (networkError) {
      uiErrorStore.push(networkError, 'apollo');
    }
  });

  const httpLink = new HttpLink({
    uri: () => resolveGraphqlHttpEndpoint(),
    fetch: globalThis.fetch,
  });
  const authLink = new ApolloLink((operation, forward) => {
    const authHeaders = getRemoteAccessAuthHeaders();
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        ...authHeaders,
      },
    }));
    return forward(operation);
  });

  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    devtools: {
      enabled: process.env.NODE_ENV !== 'production',
    },
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-first',
      },
      query: {
        fetchPolicy: 'cache-first',
      },
    },
  });
}

export function registerBoundApolloClient(
  nuxtApp: NuxtAppLike,
  client: ApolloClient<NormalizedCacheObject>,
): void {
  nuxtApp[BOUND_APOLLO_CLIENT_KEY] = client;
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!process.client) {
    return;
  }

  const windowNodeContextStore = useWindowNodeContextStore();

  const client = buildBoundApolloClient(() => {
    // Touch the reactive revision so a rebuilt Nuxt app/client sees the current binding,
    // while the HttpLink URI function resolves the latest paired-node endpoint per operation.
    void windowNodeContextStore.bindingRevision;
    return resolveCurrentGraphqlHttpEndpoint();
  });
  registerBoundApolloClient(nuxtApp as NuxtAppLike, client);
});
