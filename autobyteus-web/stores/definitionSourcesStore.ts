import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  ADD_DEFINITION_SOURCE,
  GET_DEFINITION_SOURCES,
  REMOVE_DEFINITION_SOURCE,
} from '~/graphql/definitionSources'

export interface DefinitionSource {
  path: string
  agentCount: number
  agentTeamCount: number
  isDefault: boolean
}

export const useDefinitionSourcesStore = defineStore('definitionSources', () => {
  const definitionSources = ref<DefinitionSource[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchDefinitionSources(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_DEFINITION_SOURCES,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.definitionSources) {
        definitionSources.value = data.definitionSources
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addDefinitionSource(pathValue: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ADD_DEFINITION_SOURCE,
        variables: { path: pathValue },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.addDefinitionSource) {
        definitionSources.value = data.addDefinitionSource
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeDefinitionSource(pathValue: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_DEFINITION_SOURCE,
        variables: { path: pathValue },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.removeDefinitionSource) {
        definitionSources.value = data.removeDefinitionSource
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError(): void {
    error.value = ''
  }

  const getDefinitionSources = computed(() => definitionSources.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    definitionSources,
    loading,
    error,
    fetchDefinitionSources,
    addDefinitionSource,
    removeDefinitionSource,
    clearError,
    getDefinitionSources,
    getLoading,
    getError,
  }
})
