/**
 * Prototype-only compatibility adapter.
 *
 * Presentation-facing stores are hydrated and their integration actions are
 * replaced by plugins/00.prototype-state.client.ts. This object exists only so
 * retained presentation modules can import the same helper without creating an
 * Apollo client or a network boundary.
 */
const emptyResult = async () => ({ data: {} })

export const getApolloClient = (_clientId = 'default') => ({
  query: emptyResult,
  mutate: emptyResult,
  subscribe: () => ({ subscribe: () => ({ unsubscribe: () => undefined }) }),
  clearStore: async () => undefined,
  resetStore: async () => undefined,
})
