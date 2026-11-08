import type { EmbeddedServerClientEndpoint } from '../../shared/embeddedServerClientEndpoint'
import type { ServerEnvironmentPolicy } from './serverRuntimeEnv'

export type EmbeddedServerListenerPolicy = 'preserve-backend-default'

export type EmbeddedServerLaunchConfig = Readonly<{
  clientEndpoint: EmbeddedServerClientEndpoint
  listenerPolicy: EmbeddedServerListenerPolicy
  baseDataRoot: string
  environmentPolicy: ServerEnvironmentPolicy
  /** The origin of the development renderer (`isDev`), which the node must accept; `null` when packaged. */
  developmentRendererOrigin: string | null
}>
