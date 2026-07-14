import { defineStore } from 'pinia'
import { watch } from 'vue'
import { GET_WORKING_CONTEXT_COMPACTION_STRATEGIES } from '~/graphql/queries/workingContextCompactionStrategyQueries'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getApolloClient } from '~/utils/apolloClient'

export type WorkingContextCompactionStrategyOption = Readonly<{
  id: string
  name: string
}>

type BindingAwareCatalogStore = {
  strategies: WorkingContextCompactionStrategyOption[]
  bindingRevision: number | null
  error: string | null
  isLoading: boolean
  invalidateBoundNodeState: () => void
  $dispose: () => void
  __workingContextCompactionCatalogDisposeWrapped?: boolean
}

const bindingWatcherStops = new WeakMap<object, () => void>()
const activeCatalogReadTokens = new WeakMap<object, symbol>()

const beginCatalogRead = (store: BindingAwareCatalogStore): symbol => {
  const token = Symbol('working-context-compaction-catalog-read')
  activeCatalogReadTokens.set(store, token)
  store.isLoading = true
  store.error = null
  return token
}

const isCurrentCatalogRead = (
  store: BindingAwareCatalogStore,
  token: symbol,
  bindingRevision: number,
): boolean =>
  activeCatalogReadTokens.get(store) === token &&
  useWindowNodeContextStore().bindingRevision === bindingRevision

const finishCatalogRead = (store: BindingAwareCatalogStore, token: symbol): void => {
  if (activeCatalogReadTokens.get(store) !== token) return
  activeCatalogReadTokens.delete(store)
  store.isLoading = false
}

const ensureBindingWatcher = (store: BindingAwareCatalogStore): void => {
  if (bindingWatcherStops.has(store)) return

  const windowNodeContextStore = useWindowNodeContextStore()
  const stop = watch(
    () => windowNodeContextStore.bindingRevision,
    () => store.invalidateBoundNodeState(),
    { flush: 'sync' },
  )
  bindingWatcherStops.set(store, stop)

  if (store.__workingContextCompactionCatalogDisposeWrapped) return
  const originalDispose = store.$dispose.bind(store)
  store.$dispose = () => {
    bindingWatcherStops.get(store)?.()
    bindingWatcherStops.delete(store)
    activeCatalogReadTokens.delete(store)
    originalDispose()
  }
  store.__workingContextCompactionCatalogDisposeWrapped = true
}

export const useWorkingContextCompactionStrategyCatalogStore = defineStore(
  'workingContextCompactionStrategyCatalog',
  {
    state: () => ({
      strategies: [] as WorkingContextCompactionStrategyOption[],
      bindingRevision: null as number | null,
      isLoading: false,
      error: null as string | null,
    }),
    actions: {
      invalidateBoundNodeState() {
        activeCatalogReadTokens.delete(this)
        this.strategies = []
        this.bindingRevision = null
        this.error = null
        this.isLoading = false
      },

      async fetchStrategies(force = false): Promise<readonly WorkingContextCompactionStrategyOption[]> {
        ensureBindingWatcher(this as BindingAwareCatalogStore)
        const windowNodeContextStore = useWindowNodeContextStore()
        const currentRevision = windowNodeContextStore.bindingRevision
        if (this.bindingRevision !== null && this.bindingRevision !== currentRevision) {
          this.invalidateBoundNodeState()
        }
        if (!force && this.bindingRevision === currentRevision) {
          return this.strategies
        }

        const bindingRevisionAtStart = currentRevision
        const requestToken = beginCatalogRead(this as BindingAwareCatalogStore)

        try {
          const isReady = await windowNodeContextStore.waitForBoundBackendReady()
          if (!isReady) {
            throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
          }
          if (!isCurrentCatalogRead(this as BindingAwareCatalogStore, requestToken, bindingRevisionAtStart)) {
            return this.strategies
          }

          const client = getApolloClient()
          const { data, errors } = await client.query({
            query: GET_WORKING_CONTEXT_COMPACTION_STRATEGIES,
            fetchPolicy: 'network-only',
          })
          if (errors && errors.length > 0) {
            throw new Error(errors.map((entry: any) => entry.message).join(', '))
          }
          if (!isCurrentCatalogRead(this as BindingAwareCatalogStore, requestToken, bindingRevisionAtStart)) {
            return this.strategies
          }

          const strategies = data?.getWorkingContextCompactionStrategies
          if (!Array.isArray(strategies)) {
            throw new Error('Server did not return a compaction strategy catalog')
          }
          this.strategies = strategies.map((entry: any) => ({
            id: String(entry.id),
            name: String(entry.name),
          }))
          this.bindingRevision = bindingRevisionAtStart
          return this.strategies
        } catch (error: any) {
          if (isCurrentCatalogRead(this as BindingAwareCatalogStore, requestToken, bindingRevisionAtStart)) {
            this.error = error?.message ?? 'Failed to load compaction strategies'
            this.strategies = []
            this.bindingRevision = null
          }
          throw error
        } finally {
          finishCatalogRead(this as BindingAwareCatalogStore, requestToken)
        }
      },

      async retry(): Promise<readonly WorkingContextCompactionStrategyOption[]> {
        return this.fetchStrategies(true)
      },
    },
  },
)
