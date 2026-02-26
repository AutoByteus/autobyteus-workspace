import { useApolloClient } from '@vue/apollo-composable'
import { useNuxtApp } from '#app'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'

export const getApolloClient = (clientId = 'default') => {
  const nuxtApp = useNuxtApp()
  const boundClient = (nuxtApp as any)[BOUND_APOLLO_CLIENT_KEY]
  if (boundClient) {
    return boundClient
  }

  const clients = nuxtApp._apolloClients || nuxtApp.$apollo?.clients
  const directClient =
    (clientId && clients?.[clientId]) ||
    clients?.default ||
    nuxtApp.$apollo?.defaultClient
  if (directClient) {
    return directClient
  }

  return nuxtApp.runWithContext(() => useApolloClient().client)
}
