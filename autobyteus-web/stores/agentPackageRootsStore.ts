import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  ADD_AGENT_PACKAGE_ROOT,
  GET_AGENT_PACKAGE_ROOTS,
  REMOVE_AGENT_PACKAGE_ROOT,
} from '~/graphql/agentPackageRoots'

export interface AgentPackageRoot {
  path: string
  sharedAgentCount: number
  teamLocalAgentCount: number
  agentTeamCount: number
  isDefault: boolean
}

export const useAgentPackageRootsStore = defineStore('agentPackageRoots', () => {
  const agentPackageRoots = ref<AgentPackageRoot[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchAgentPackageRoots(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_AGENT_PACKAGE_ROOTS,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.agentPackageRoots) {
        agentPackageRoots.value = data.agentPackageRoots
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addAgentPackageRoot(pathValue: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: ADD_AGENT_PACKAGE_ROOT,
        variables: { path: pathValue },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.addAgentPackageRoot) {
        agentPackageRoots.value = data.addAgentPackageRoot
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeAgentPackageRoot(pathValue: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_AGENT_PACKAGE_ROOT,
        variables: { path: pathValue },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry) => entry.message).join(', '))
      }

      if (data?.removeAgentPackageRoot) {
        agentPackageRoots.value = data.removeAgentPackageRoot
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

  const getAgentPackageRoots = computed(() => agentPackageRoots.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    agentPackageRoots,
    loading,
    error,
    fetchAgentPackageRoots,
    addAgentPackageRoot,
    removeAgentPackageRoot,
    clearError,
    getAgentPackageRoots,
    getLoading,
    getError,
  }
})
