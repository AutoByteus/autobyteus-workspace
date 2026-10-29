import type { RemoteRunRetryAdapter } from '~/stores/remoteRunsStore'

/**
 * A remote run's Retry adapter for specs about something else (rows, views, contexts): Retry asks the root's stream
 * (`refresh`, answering whether it asked) and every agent counts as loaded, so nothing is read.
 */
export const streamOnlyRetryAdapter = (refresh: () => boolean = () => true): RemoteRunRetryAdapter => Object.freeze({
  refreshOnStream: () => refresh(),
  selectedAgent: () => null,
  isLoaded: () => true,
  rereadAgent: () => false,
})
