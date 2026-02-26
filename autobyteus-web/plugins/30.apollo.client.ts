import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { useUiErrorStore } from '~/stores/uiErrorStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

export const BOUND_APOLLO_CLIENT_KEY = '__boundApolloClient';

type NuxtAppLike = {
  [BOUND_APOLLO_CLIENT_KEY]?: ApolloClient<unknown>;
  _apolloClients?: Record<string, ApolloClient<unknown>>;
  $apollo?: {
    clients?: Record<string, ApolloClient<unknown>>;
    defaultClient?: ApolloClient<unknown>;
  };
};

export function buildBoundApolloClient(graphqlHttpEndpoint: string): ApolloClient<unknown> {
  const uiErrorStore = useUiErrorStore();

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
    uri: graphqlHttpEndpoint,
    fetch: globalThis.fetch,
  });

  return new ApolloClient({
    link: ApolloLink.from([errorLink, httpLink]),
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
  client: ApolloClient<unknown>,
): void {
  nuxtApp[BOUND_APOLLO_CLIENT_KEY] = client;

  nuxtApp._apolloClients = nuxtApp._apolloClients || {};
  nuxtApp._apolloClients.default = client;

  const apolloCompat = nuxtApp.$apollo;
  if (apolloCompat) {
    apolloCompat.clients = apolloCompat.clients || {};
    apolloCompat.clients.default = client;
    apolloCompat.defaultClient = client;
    return;
  }

  // Fallback for contexts where `$apollo` is not present at all.
  // Guarded to avoid writing into getter-only Nuxt app properties.
  try {
    ;(nuxtApp as { $apollo?: NuxtAppLike['$apollo'] }).$apollo = {
      clients: { default: client },
      defaultClient: client,
    };
  } catch {
    // In getter-only contexts we already updated `_apolloClients`, which is enough for `getApolloClient`.
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!process.client) {
    return;
  }

  const windowNodeContextStore = useWindowNodeContextStore();
  const graphqlHttpEndpoint = windowNodeContextStore.getBoundEndpoints().graphqlHttp;

  const client = buildBoundApolloClient(graphqlHttpEndpoint);
  registerBoundApolloClient(nuxtApp as NuxtAppLike, client);
});
