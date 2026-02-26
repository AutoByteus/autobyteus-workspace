import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { GET_SEARCH_CONFIG, GET_SERVER_SETTINGS } from '~/graphql/queries/server_settings_queries'
import {
  DELETE_SERVER_SETTING,
  SET_SEARCH_CONFIG,
  UPDATE_SERVER_SETTING,
} from '~/graphql/mutations/server_settings_mutations'

export interface ServerSetting {
  key: string
  value: string
  description: string
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

export const useServerSettingsStore = defineStore('serverSettings', {
  state: () => ({
    settings: [] as ServerSetting[],
    searchConfig: defaultSearchConfig() as SearchConfigState,
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
    async fetchServerSettings() {
      if (this.settings.length > 0) return this.settings

      this.isLoading = true
      this.error = null

      const client = getApolloClient()
      try {
        const { data } = await client.query({
          query: GET_SERVER_SETTINGS
        })

        this.settings = data?.getServerSettings ?? []
        return this.settings
      } catch (error: any) {
        this.error = error.message ?? 'Failed to fetch server settings'
        console.error('Failed to fetch server settings:', error)
        this.settings = []
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async reloadServerSettings() {
      this.isLoading = true;
      this.error = null;

      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_SERVER_SETTINGS,
          fetchPolicy: 'network-only' // Force network fetch, bypassing cache
        });

        this.settings = data?.getServerSettings ?? [];
        return this.settings;
      } catch (error: any) {
        this.error = error.message ?? 'Failed to reload server settings';
        console.error('Failed to reload server settings:', error);
        this.settings = [];
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSearchConfig() {
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_SEARCH_CONFIG,
          fetchPolicy: 'network-only',
        })

        this.searchConfig = data?.getSearchConfig ?? defaultSearchConfig()
        return this.searchConfig
      } catch (error: any) {
        console.error('Failed to fetch search config:', error)
        this.searchConfig = defaultSearchConfig()
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

        await this.fetchSearchConfig()
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
