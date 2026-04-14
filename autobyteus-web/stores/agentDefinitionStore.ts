import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetAgentDefinitions } from '~/graphql/queries/agentDefinitionQueries'
import {
  CreateAgentDefinition,
  DeleteAgentDefinition,
  DuplicateAgentDefinition,
  UpdateAgentDefinition,
} from '~/graphql/mutations/agentDefinitionMutations'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

export type AgentDefinitionOwnershipScope = 'SHARED' | 'TEAM_LOCAL' | 'APPLICATION_OWNED'

export interface AgentDefinitionDefaultLaunchConfig {
  llmModelIdentifier?: string | null
  runtimeKind?: string | null
  llmConfig?: Record<string, unknown> | null
}

export interface AgentDefinition {
  __typename?: 'AgentDefinition'
  id: string
  name: string
  role?: string | null
  description: string
  instructions: string
  category?: string | null
  avatarUrl?: string | null
  toolNames: string[]
  inputProcessorNames: string[]
  llmResponseProcessorNames: string[]
  systemPromptProcessorNames: string[]
  toolExecutionResultProcessorNames: string[]
  toolInvocationPreprocessorNames: string[]
  lifecycleProcessorNames: string[]
  skillNames: string[]
  ownershipScope?: AgentDefinitionOwnershipScope | null
  ownerTeamId?: string | null
  ownerTeamName?: string | null
  ownerApplicationId?: string | null
  ownerApplicationName?: string | null
  ownerPackageId?: string | null
  ownerLocalApplicationId?: string | null
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null
}

export interface CreateAgentDefinitionInput {
  name: string
  role?: string | null
  description: string
  instructions: string
  category?: string | null
  avatarUrl?: string | null
  toolNames?: string[]
  inputProcessorNames?: string[]
  llmResponseProcessorNames?: string[]
  systemPromptProcessorNames?: string[]
  toolExecutionResultProcessorNames?: string[]
  toolInvocationPreprocessorNames?: string[]
  lifecycleProcessorNames?: string[]
  skillNames?: string[]
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null
}

export interface UpdateAgentDefinitionInput {
  id: string
  name?: string | null
  role?: string | null
  description?: string | null
  instructions?: string | null
  category?: string | null
  avatarUrl?: string | null
  toolNames?: string[]
  inputProcessorNames?: string[]
  llmResponseProcessorNames?: string[]
  systemPromptProcessorNames?: string[]
  toolExecutionResultProcessorNames?: string[]
  toolInvocationPreprocessorNames?: string[]
  lifecycleProcessorNames?: string[]
  skillNames?: string[]
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null
}

interface DeleteResult {
  success: boolean
  message: string
}

interface DuplicateAgentDefinitionInput {
  sourceId: string
  newName: string
}

const normalizeOwnershipScope = (
  value: AgentDefinitionOwnershipScope | null | undefined,
): AgentDefinitionOwnershipScope => {
  if (value === 'TEAM_LOCAL' || value === 'APPLICATION_OWNED') {
    return value
  }
  return 'SHARED'
}

export const useAgentDefinitionStore = defineStore('agentDefinition', () => {
  const agentDefinitions = ref<AgentDefinition[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const deleteResult = ref<DeleteResult | null>(null)

  const fetchAllAgentDefinitions = async () => {
    if (agentDefinitions.value.length > 0) {
      return
    }

    const windowNodeContextStore = useWindowNodeContextStore()
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      error.value = new Error('Bound backend is not ready')
      return
    }

    loading.value = true
    error.value = null
    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GetAgentDefinitions,
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      agentDefinitions.value = data.agentDefinitions || []
    } catch (cause) {
      error.value = cause
      console.error('Failed to fetch agent definitions:', cause)
    } finally {
      loading.value = false
    }
  }

  const reloadAllAgentDefinitions = async () => {
    loading.value = true
    error.value = null
    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GetAgentDefinitions,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      agentDefinitions.value = data.agentDefinitions || []
    } catch (cause) {
      error.value = cause
      console.error('Failed to reload agent definitions:', cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  const createAgentDefinition = async (
    input: CreateAgentDefinitionInput,
  ): Promise<AgentDefinition | null> => {
    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: CreateAgentDefinition,
        variables: { input },
        update: (cache: any, result: { data?: { createAgentDefinition?: AgentDefinition | null } }) => {
          if (!result.data?.createAgentDefinition) {
            return
          }

          const existingData = cache.readQuery({
            query: GetAgentDefinitions,
          }) as { agentDefinitions: AgentDefinition[] } | null
          if (!existingData) {
            return
          }

          const nextAgentDefinitions = [
            result.data.createAgentDefinition,
            ...existingData.agentDefinitions,
          ]

          cache.writeQuery({
            query: GetAgentDefinitions,
            data: {
              agentDefinitions: nextAgentDefinitions,
            },
          })

          agentDefinitions.value = nextAgentDefinitions as AgentDefinition[]
        },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      return data?.createAgentDefinition || null
    } catch (cause) {
      error.value = cause
      console.error('Failed to create agent definition:', cause)
      throw cause
    }
  }

  const updateAgentDefinition = async (
    input: UpdateAgentDefinitionInput,
  ): Promise<AgentDefinition | null> => {
    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: UpdateAgentDefinition,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (!data?.updateAgentDefinition) {
        return null
      }

      const index = agentDefinitions.value.findIndex((definition) => definition.id === input.id)
      if (index !== -1) {
        const nextAgentDefinitions = [...agentDefinitions.value]
        nextAgentDefinitions[index] = {
          ...nextAgentDefinitions[index],
          ...data.updateAgentDefinition,
        }
        agentDefinitions.value = nextAgentDefinitions
      }

      return data.updateAgentDefinition
    } catch (cause) {
      error.value = cause
      console.error('Failed to update agent definition:', cause)
      throw cause
    }
  }

  const deleteAgentDefinition = async (id: string): Promise<DeleteResult | null> => {
    deleteResult.value = null
    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DeleteAgentDefinition,
        variables: { id },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (!data?.deleteAgentDefinition) {
        return null
      }

      deleteResult.value = data.deleteAgentDefinition
      if (data.deleteAgentDefinition.success) {
        agentDefinitions.value = agentDefinitions.value.filter((definition) => definition.id !== id)
        await reloadAllAgentDefinitions()
      }

      return data.deleteAgentDefinition
    } catch (cause) {
      error.value = cause
      console.error('Failed to delete agent definition:', cause)
      throw cause
    }
  }

  const duplicateAgentDefinition = async (
    input: DuplicateAgentDefinitionInput,
  ): Promise<AgentDefinition | null> => {
    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DuplicateAgentDefinition,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (!data?.duplicateAgentDefinition) {
        return null
      }

      await reloadAllAgentDefinitions()
      return data.duplicateAgentDefinition
    } catch (cause) {
      error.value = cause
      console.error('Failed to duplicate agent definition:', cause)
      throw cause
    }
  }

  const clearDeleteResult = () => {
    deleteResult.value = null
  }

  const invalidateAgentDefinitions = (): void => {
    agentDefinitions.value = []
    loading.value = false
    error.value = null
    deleteResult.value = null
  }

  const getAgentDefinitionById = computed(() => (
    (id: string) => agentDefinitions.value.find((definition) => definition.id === id)
  ))

  const sharedAgentDefinitions = computed(() => (
    agentDefinitions.value.filter(
      (definition) => normalizeOwnershipScope(definition.ownershipScope) === 'SHARED',
    )
  ))

  const applicationOwnedAgentDefinitions = computed(() => (
    agentDefinitions.value.filter(
      (definition) => normalizeOwnershipScope(definition.ownershipScope) === 'APPLICATION_OWNED',
    )
  ))

  const getApplicationOwnedAgentDefinitionsByOwnerApplicationId = computed(() => (
    (ownerApplicationId: string): AgentDefinition[] => applicationOwnedAgentDefinitions.value.filter(
      (definition) => (definition.ownerApplicationId || '').trim() === ownerApplicationId.trim(),
    )
  ))

  const getDeleteResult = computed(() => deleteResult.value)

  return {
    agentDefinitions,
    sharedAgentDefinitions,
    applicationOwnedAgentDefinitions,
    loading,
    error,
    deleteResult,
    fetchAllAgentDefinitions,
    reloadAllAgentDefinitions,
    createAgentDefinition,
    updateAgentDefinition,
    deleteAgentDefinition,
    duplicateAgentDefinition,
    clearDeleteResult,
    invalidateAgentDefinitions,
    getAgentDefinitionById,
    getApplicationOwnedAgentDefinitionsByOwnerApplicationId,
    getDeleteResult,
  }
})
