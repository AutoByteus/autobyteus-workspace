import type { EmbeddedServerClientEndpoint } from '../../shared/embeddedServerClientEndpoint'

export type EmbeddedServerListenerPolicy = 'preserve-backend-default'

export type EmbeddedServerLaunchConfig = Readonly<{
  clientEndpoint: EmbeddedServerClientEndpoint
  listenerPolicy: EmbeddedServerListenerPolicy
  baseDataRoot: string
}>
