import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'
import { useNuxtApp } from '#app'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'

/** The Apollo client the Apollo plugin bound to the Nuxt app (plugins/30.apollo.client.ts). */
export const getApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  const boundClient = useNuxtApp()[BOUND_APOLLO_CLIENT_KEY]
  if (!boundClient) {
    throw new Error('No Apollo client is bound: the Apollo plugin has not bound a client to this Nuxt app.')
  }
  return boundClient
}
