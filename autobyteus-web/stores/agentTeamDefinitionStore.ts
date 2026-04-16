import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetAgentTeamDefinitions } from '~/graphql/queries/agentTeamDefinitionQueries'
import {
  CreateAgentTeamDefinition,
  DeleteAgentTeamDefinition,
  UpdateAgentTeamDefinition,
} from '~/graphql/mutations/agentTeamDefinitionMutations'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { DefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'

export type AgentTeamDefinitionOwnershipScope = 'SHARED' | 'APPLICATION_OWNED'
export type AgentMemberRefScope = 'SHARED' | 'TEAM_LOCAL' | 'APPLICATION_OWNED' | null

export interface TeamMemberInput {
  __typename?: string
  memberName: string
  ref: string
  refType: 'AGENT' | 'AGENT_TEAM'
  refScope?: AgentMemberRefScope
}

export interface AgentTeamDefinition {
  __typename?: 'AgentTeamDefinition'
  id: string
  name: string
  description: string
  instructions: string
  category?: string | null
  avatarUrl?: string | null
  updatedAt?: string | null
  coordinatorMemberName: string
  nodes: TeamMemberInput[]
  ownershipScope?: AgentTeamDefinitionOwnershipScope | null
  ownerApplicationId?: string | null
  ownerApplicationName?: string | null
  ownerPackageId?: string | null
  ownerLocalApplicationId?: string | null
  defaultLaunchConfig?: DefaultLaunchConfig | null
}

export interface CreateAgentTeamDefinitionInput {
  name: string
  description: string
  instructions: string
  category?: string | null
  coordinatorMemberName: string
  avatarUrl?: string | null
  nodes: TeamMemberInput[]
  defaultLaunchConfig?: DefaultLaunchConfig | null
}

export interface UpdateAgentTeamDefinitionInput {
  id: string
  name?: string | null
  description?: string | null
  instructions?: string | null
  category?: string | null
  coordinatorMemberName?: string | null
  avatarUrl?: string | null
  nodes?: TeamMemberInput[] | null
  defaultLaunchConfig?: DefaultLaunchConfig | null
}

const normalizeOwnershipScope = (
  value: AgentTeamDefinitionOwnershipScope | null | undefined,
): AgentTeamDefinitionOwnershipScope => (
  value === 'APPLICATION_OWNED' ? 'APPLICATION_OWNED' : 'SHARED'
)

export const useAgentTeamDefinitionStore = defineStore('agentTeamDefinition', () => {
  const agentTeamDefinitions = ref<AgentTeamDefinition[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)

  const fetchAllAgentTeamDefinitions = async () => {
    if (agentTeamDefinitions.value.length > 0) {
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
        query: GetAgentTeamDefinitions,
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      agentTeamDefinitions.value = (data.agentTeamDefinitions || []) as AgentTeamDefinition[]
    } catch (cause) {
      error.value = cause
      console.error('Failed to fetch agent team definitions:', cause)
    } finally {
      loading.value = false
    }
  }

  const reloadAllAgentTeamDefinitions = async () => {
    loading.value = true
    error.value = null
    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GetAgentTeamDefinitions,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      agentTeamDefinitions.value = (data.agentTeamDefinitions || []) as AgentTeamDefinition[]
    } catch (cause) {
      error.value = cause
      console.error('Failed to reload agent team definitions:', cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  const createAgentTeamDefinition = async (
    input: CreateAgentTeamDefinitionInput,
  ): Promise<AgentTeamDefinition | null> => {
    try {
      const client = getApolloClient()
      const cleanedInput = JSON.parse(JSON.stringify(input))
      if (cleanedInput.nodes) {
        cleanedInput.nodes.forEach((node: { __typename?: string }) => delete node.__typename)
      }

      const { data, errors } = await client.mutate({
        mutation: CreateAgentTeamDefinition,
        variables: { input: cleanedInput },
        refetchQueries: [{ query: GetAgentTeamDefinitions }],
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (!data?.createAgentTeamDefinition) {
        return null
      }

      await client.query({ query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' }).then((result: { data: { agentTeamDefinitions?: AgentTeamDefinition[] } }) => {
        agentTeamDefinitions.value = (result.data.agentTeamDefinitions || []) as AgentTeamDefinition[]
      })
      return getAgentTeamDefinitionById.value(data.createAgentTeamDefinition.id)
    } catch (cause) {
      error.value = cause
      console.error('Failed to create agent team definition:', cause)
      throw cause
    }
  }

  const updateAgentTeamDefinition = async (
    input: UpdateAgentTeamDefinitionInput,
  ): Promise<AgentTeamDefinition | null> => {
    try {
      const client = getApolloClient()
      const cleanedInput = JSON.parse(JSON.stringify(input))
      if (cleanedInput.nodes) {
        cleanedInput.nodes.forEach((node: { __typename?: string }) => delete node.__typename)
      }

      const { data, errors } = await client.mutate({
        mutation: UpdateAgentTeamDefinition,
        variables: { input: cleanedInput },
        refetchQueries: [{ query: GetAgentTeamDefinitions }],
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (!data?.updateAgentTeamDefinition) {
        return null
      }

      await client.query({ query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' }).then((result: { data: { agentTeamDefinitions?: AgentTeamDefinition[] } }) => {
        agentTeamDefinitions.value = (result.data.agentTeamDefinitions || []) as AgentTeamDefinition[]
      })
      return getAgentTeamDefinitionById.value(data.updateAgentTeamDefinition.id)
    } catch (cause) {
      error.value = cause
      console.error('Failed to update agent team definition:', cause)
      throw cause
    }
  }

  const deleteAgentTeamDefinition = async (id: string): Promise<boolean> => {
    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: DeleteAgentTeamDefinition,
        variables: { id },
        update: (cache: any) => {
          cache.modify({
            fields: {
              agentTeamDefinitions(existingDefinitions: unknown[] = [], { readField }: { readField: (fieldName: string, ref: unknown) => unknown }) {
                return existingDefinitions.filter((definitionRef) => readField('id', definitionRef) !== id)
              },
            },
          })
          cache.evict({ id: cache.identify({ __typename: 'AgentTeamDefinition', id }) })
          cache.gc()
        },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const success = Boolean(data?.deleteAgentTeamDefinition?.success)
      if (success) {
        agentTeamDefinitions.value = agentTeamDefinitions.value.filter((definition) => definition.id !== id)
      }
      return success
    } catch (cause) {
      error.value = cause
      console.error('Failed to delete agent team definition:', cause)
      throw cause
    }
  }

  const getAgentTeamDefinitionById = computed(() => (
    (id: string) => agentTeamDefinitions.value.find((definition) => definition.id === id) || null
  ))

  const getAgentTeamDefinitionByName = computed(() => (
    (name: string) => agentTeamDefinitions.value.find((definition) => definition.name === name) || null
  ))

  const sharedAgentTeamDefinitions = computed(() => (
    agentTeamDefinitions.value.filter(
      (definition) => normalizeOwnershipScope(definition.ownershipScope) === 'SHARED',
    )
  ))

  const applicationOwnedAgentTeamDefinitions = computed(() => (
    agentTeamDefinitions.value.filter(
      (definition) => normalizeOwnershipScope(definition.ownershipScope) === 'APPLICATION_OWNED',
    )
  ))

  const getApplicationOwnedTeamDefinitionsByOwnerApplicationId = computed(() => (
    (ownerApplicationId: string): AgentTeamDefinition[] => applicationOwnedAgentTeamDefinitions.value.filter(
      (definition) => (definition.ownerApplicationId || '').trim() === ownerApplicationId.trim(),
    )
  ))

  const invalidateAgentTeamDefinitions = (): void => {
    agentTeamDefinitions.value = []
    loading.value = false
    error.value = null
  }

  return {
    agentTeamDefinitions,
    sharedAgentTeamDefinitions,
    applicationOwnedAgentTeamDefinitions,
    loading,
    error,
    fetchAllAgentTeamDefinitions,
    reloadAllAgentTeamDefinitions,
    createAgentTeamDefinition,
    updateAgentTeamDefinition,
    deleteAgentTeamDefinition,
    invalidateAgentTeamDefinitions,
    getAgentTeamDefinitionById,
    getAgentTeamDefinitionByName,
    getApplicationOwnedTeamDefinitionsByOwnerApplicationId,
  }
})
