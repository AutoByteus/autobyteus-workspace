import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'
import { useNuxtApp } from '#app'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'

/** The Apollo client the Apollo plugin bound to the Nuxt app (plugins/30.apollo.client.ts). */
export const getApolloClient = (clientId = 'default'): ApolloClient<NormalizedCacheObject> => {
  const nuxtApp = useNuxtApp()
  const boundClient = nuxtApp[BOUND_APOLLO_CLIENT_KEY]
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

  throw new Error(`Apollo client with id ${clientId} not found: the Apollo plugin has not bound a client to this Nuxt app.`)
}
