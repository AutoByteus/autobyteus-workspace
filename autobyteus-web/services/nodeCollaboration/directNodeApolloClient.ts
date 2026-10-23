import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core'
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints'

/** A request to another node's server waits at most this long (its own peer requests are bounded by 20 s). */
export const DIRECT_NODE_REQUEST_TIMEOUT_MS = 25_000

const clients = new Map<string, ApolloClient<unknown>>()

const boundedFetch: typeof fetch = (input, init) =>
  globalThis.fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(DIRECT_NODE_REQUEST_TIMEOUT_MS) })

/**
 * A GraphQL client for a node other than the one this window is bound to (one-nodes-tab DS-003/DS-004): no result
 * cache, no global error reporting and no remote-access headers, because that node is not the bound node. Its errors
 * are the caller's to word.
 */
export const directNodeApolloClient = (baseUrl: string): ApolloClient<unknown> => {
  const uri = deriveNodeEndpoints(baseUrl).graphqlHttp
  let client = clients.get(uri)
  if (!client) {
    client = new ApolloClient({
      link: new HttpLink({ uri, fetch: boundedFetch }),
      cache: new InMemoryCache(),
      defaultOptions: {
        query: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
        mutate: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
      },
    })
    clients.set(uri, client)
  }
  return client
}
