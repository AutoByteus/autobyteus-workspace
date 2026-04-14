import { defineStore } from 'pinia'
import { watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GET_SEARCH_CONFIG, GET_SERVER_SETTINGS } from '~/graphql/queries/server_settings_queries'
import {
  DELETE_SERVER_SETTING,
  SET_SEARCH_CONFIG,
  UPDATE_SERVER_SETTING,
} from '~/graphql/mutations/server_settings_mutations'
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

export interface ServerSetting {
  key: string
  value: string
  description: string
  isEditable: boolean
  isDeletable: boolean
}

export type SearchProvider = 'serper' | 'serpapi' | 'google_cse' | 'vertex_ai_search'

export interface SearchConfigState {
  provider: SearchProvider | ''
  serperApiKeyConfigured: boolean
  serpapiApiKeyConfigured: boolean
  googleCseApiKeyConfigured: boolean
  googleCseId: string | null
  vertexAiSearchApiKeyConfigured: boolean
  vertexAiSearchServingConfig: string | null
}

export interface SetSearchConfigInput {
  provider: SearchProvider
  serperApiKey?: string | null
  serpapiApiKey?: string | null
  googleCseApiKey?: string | null
  googleCseId?: string | null
  vertexAiSearchApiKey?: string | null
  vertexAiSearchServingConfig?: string | null
}

const defaultSearchConfig = (): SearchConfigState => ({
  provider: '',
  serperApiKeyConfigured: false,
  serpapiApiKeyConfigured: false,
  googleCseApiKeyConfigured: false,
  googleCseId: null,
  vertexAiSearchApiKeyConfigured: false,
  vertexAiSearchServingConfig: null,
})

const APPLICATIONS_SETTING_KEY = 'ENABLE_APPLICATIONS'

type ServerSettingsBindingAwareStore = {
  settings: ServerSetting[]
  searchConfig: SearchConfigState
  error: string | null
  settingsBindingRevision: number | null
  searchConfigBindingRevision: number | null
  invalidateBoundNodeState: () => void
  $dispose: () => void
  __serverSettingsBindingDisposeWrapped?: boolean
}

const bindingWatcherStops = new WeakMap<object, () => void>()

const ensureBindingWatcher = (store: ServerSettingsBindingAwareStore): void => {
  if (bindingWatcherStops.has(store)) {
    return
  }

  const windowNodeContextStore = useWindowNodeContextStore()
  const stop = watch(
    () => windowNodeContextStore.bindingRevision,
    () => {
      store.invalidateBoundNodeState()
    },
    { flush: 'sync' },
  )

  bindingWatcherStops.set(store, stop)

  if (store.__serverSettingsBindingDisposeWrapped) {
    return
  }

  const originalDispose = store.$dispose.bind(store)
  store.$dispose = () => {
    const registeredStop = bindingWatcherStops.get(store)
    if (registeredStop) {
      registeredStop()
      bindingWatcherStops.delete(store)
    }
    originalDispose()
  }
  store.__serverSettingsBindingDisposeWrapped = true
}

const invalidateStaleBindingCache = (
  store: Pick<ServerSettingsBindingAwareStore, 'settingsBindingRevision' | 'searchConfigBindingRevision' | 'invalidateBoundNodeState'>,
  currentBindingRevision: number,
): void => {
  if (
    (store.settingsBindingRevision !== null && store.settingsBindingRevision !== currentBindingRevision) ||
    (store.searchConfigBindingRevision !== null && store.searchConfigBindingRevision !== currentBindingRevision)
  ) {
    store.invalidateBoundNodeState()
  }
}

const ensureBoundBackendReady = async (): Promise<number> => {
  const windowNodeContextStore = useWindowNodeContextStore()
  const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
  const isReady = await windowNodeContextStore.waitForBoundBackendReady()

  if (!isReady) {
    throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
  }

  return bindingRevisionAtStart
}

export const useServerSettingsStore = defineStore('serverSettings', {
  state: () => ({
    settings: [] as ServerSetting[],
    settingsBindingRevision: null as number | null,
    searchConfig: defaultSearchConfig() as SearchConfigState,
    searchConfigBindingRevision: null as number | null,
    isLoading: false,
    error: null as string | null,
    isUpdating: false
  }),
  getters: {
    getSettingByKey: (state) => (key: string) => {
      return state.settings.find((setting) => setting.key === key)
    }
  },
  actions: {
    invalidateBoundNodeState() {
      this.settings = []
      this.settingsBindingRevision = null
      this.searchConfig = defaultSearchConfig()
      this.searchConfigBindingRevision = null
      this.error = null
    },

    async fetchServerSettings() {
      ensureBindingWatcher(this as ServerSettingsBindingAwareStore)

      const windowNodeContextStore = useWindowNodeContextStore()
      invalidateStaleBindingCache(this, windowNodeContextStore.bindingRevision)
      if (this.settingsBindingRevision === windowNodeContextStore.bindingRevision) {
        return this.settings
      }

      this.isLoading = true
      this.error = null

      const client = getApolloClient()
      try {
        const bindingRevisionAtStart = await ensureBoundBackendReady()
        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.settings
        }

        const { data } = await client.query({
          query: GET_SERVER_SETTINGS
        })

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.settings
        }

        this.settings = data?.getServerSettings ?? []
        this.settingsBindingRevision = bindingRevisionAtStart
        return this.settings
      } catch (error: any) {
        this.error = error.message ?? 'Failed to fetch server settings'
        console.error('Failed to fetch server settings:', error)
        this.settings = []
        this.settingsBindingRevision = null
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async reloadServerSettings() {
      ensureBindingWatcher(this as ServerSettingsBindingAwareStore)

      const windowNodeContextStore = useWindowNodeContextStore()
      invalidateStaleBindingCache(this, windowNodeContextStore.bindingRevision)

      this.isLoading = true;
      this.error = null;

      const client = getApolloClient()

      try {
        const bindingRevisionAtStart = await ensureBoundBackendReady()
        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.settings
        }

        const { data } = await client.query({
          query: GET_SERVER_SETTINGS,
          fetchPolicy: 'network-only' // Force network fetch, bypassing cache
        });

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.settings
        }

        this.settings = data?.getServerSettings ?? [];
        this.settingsBindingRevision = bindingRevisionAtStart
        return this.settings;
      } catch (error: any) {
        this.error = error.message ?? 'Failed to reload server settings';
        console.error('Failed to reload server settings:', error);
        this.settings = [];
        this.settingsBindingRevision = null
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSearchConfig(force = false) {
      ensureBindingWatcher(this as ServerSettingsBindingAwareStore)

      const windowNodeContextStore = useWindowNodeContextStore()
      invalidateStaleBindingCache(this, windowNodeContextStore.bindingRevision)
      if (!force && this.searchConfigBindingRevision === windowNodeContextStore.bindingRevision) {
        return this.searchConfig
      }

      const client = getApolloClient()

      try {
        const bindingRevisionAtStart = await ensureBoundBackendReady()
        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.searchConfig
        }

        const { data } = await client.query({
          query: GET_SEARCH_CONFIG,
          fetchPolicy: 'network-only',
        })

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          return this.searchConfig
        }

        this.searchConfig = data?.getSearchConfig ?? defaultSearchConfig()
        this.searchConfigBindingRevision = bindingRevisionAtStart
        return this.searchConfig
      } catch (error: any) {
        console.error('Failed to fetch search config:', error)
        this.searchConfig = defaultSearchConfig()
        this.searchConfigBindingRevision = null
        throw error
      }
    },

    async setSearchConfig(input: SetSearchConfigInput) {
      this.isUpdating = true
      this.error = null

      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate({
          mutation: SET_SEARCH_CONFIG,
          variables: {
            provider: input.provider,
            serperApiKey: input.serperApiKey ?? null,
            serpapiApiKey: input.serpapiApiKey ?? null,
            googleCseApiKey: input.googleCseApiKey ?? null,
            googleCseId: input.googleCseId ?? null,
            vertexAiSearchApiKey: input.vertexAiSearchApiKey ?? null,
            vertexAiSearchServingConfig: input.vertexAiSearchServingConfig ?? null,
          },
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: any) => e.message).join(', '))
        }

        const responseMessage = data?.setSearchConfig
        if (!responseMessage || !responseMessage.includes('successfully')) {
          this.error = responseMessage || 'Failed to update search configuration'
          throw new Error(this.error ?? 'Failed to update search configuration')
        }

        await this.fetchSearchConfig(true)
        await this.reloadServerSettings()
        return true
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to update search configuration:', error)
        throw error
      } finally {
        this.isUpdating = false
      }
    },
    
    async updateServerSetting(key: string, value: string) {
      this.isUpdating = true
      this.error = null
      
      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate({
          mutation: UPDATE_SERVER_SETTING,
          variables: { key, value }
        })
        
        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: any) => e.message).join(', '))
        }
        
        const responseMessage = data?.updateServerSetting
        
        if (responseMessage && responseMessage.includes("successfully")) {
          // Reload settings from server to ensure state is consistent
          await this.reloadServerSettings();
          if (key.trim().toUpperCase() === APPLICATIONS_SETTING_KEY) {
            await useApplicationsCapabilityStore().refresh()
          }
          return true
        }
        
        this.error = responseMessage || 'Failed to update server setting'
        throw new Error(responseMessage || 'Failed to update server setting')
      } catch (error: any) {
        this.error = error.message
        console.error(`Failed to update server setting ${key}:`, error)
        throw error
      } finally {
        this.isUpdating = false
      }
    },

    async deleteServerSetting(key: string) {
      this.isUpdating = true
      this.error = null

      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate({
          mutation: DELETE_SERVER_SETTING,
          variables: { key }
        })

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: any) => e.message).join(', '))
        }

        const responseMessage = data?.deleteServerSetting

        if (responseMessage && responseMessage.includes('successfully')) {
          await this.reloadServerSettings()
          return true
        }

        this.error = responseMessage || 'Failed to delete server setting'
        throw new Error(responseMessage || 'Failed to delete server setting')
      } catch (error: any) {
        this.error = error.message
        console.error(`Failed to delete server setting ${key}:`, error)
        throw error
      } finally {
        this.isUpdating = false
      }
    }
  }
})
