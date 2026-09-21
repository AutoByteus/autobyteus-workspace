import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetAgentOrgDefinitions } from '~/graphql/queries/agentOrgDefinitionQueries'
import { CreateAgentOrgDefinition, DeleteAgentOrgDefinition, UpdateAgentOrgDefinition } from '~/graphql/mutations/agentOrgDefinitionMutations'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { DefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'
import type { DefinitionHandoff } from '~/types/collaboration/handoffs'

export type AgentOrgMember = {
  __typename?: 'AgentOrgMember'
  memberName: string
  ref: string
  refType: 'AGENT' | 'AGENT_TEAM'
  refScope: 'SHARED' | 'AGENT_ORG_OWNED' | 'APPLICATION_OWNED'
}
export type AgentOrgDefinition = {
  id: string
  name: string
  description: string
  instructions: string
  category?: string | null
  avatarUrl?: string | null
  revision: string
  members: AgentOrgMember[]
  handoffs: DefinitionHandoff[]
  defaultLaunchConfig?: DefaultLaunchConfig | null
}
export type AgentOrgDefinitionDraft = Omit<AgentOrgDefinition, 'id' | 'revision'>

type AgentOrgMemberInput = Omit<AgentOrgMember, '__typename'>

const toMutationMembers = (members: readonly AgentOrgMember[]): AgentOrgMemberInput[] => members.map((member) => ({
  memberName: member.memberName,
  ref: member.ref,
  refType: member.refType,
  refScope: member.refScope,
}))

const mutationDefinition = (value: unknown, expectedId?: string): AgentOrgDefinition => {
  const definition = value as AgentOrgDefinition | null | undefined
  if (!definition || typeof definition.id !== 'string' || !definition.id.trim()
    || (expectedId !== undefined && definition.id !== expectedId)
    || typeof definition.revision !== 'string' || !definition.revision
    || typeof definition.name !== 'string' || typeof definition.description !== 'string'
    || typeof definition.instructions !== 'string' || !Array.isArray(definition.members) || !Array.isArray(definition.handoffs)) {
    throw new Error('Invalid Agent Org mutation response.')
  }
  return definition
}

export const useAgentOrgDefinitionStore = defineStore('agentOrgDefinition', () => {
  const definitions = ref<AgentOrgDefinition[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const byId = computed(() => (id: string) => definitions.value.find((item) => item.id === id) ?? null)
  const fetchAll = async (force = false): Promise<void> => {
    if (!force && definitions.value.length) return
    if (!(await useWindowNodeContextStore().waitForBoundBackendReady())) return
    loading.value = true; error.value = null
    try {
      const { data, errors } = await getApolloClient().query({ query: GetAgentOrgDefinitions, fetchPolicy: force ? 'network-only' : 'cache-first' })
      if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      definitions.value = data.agentOrgDefinitions ?? []
    } catch (cause) { error.value = cause; throw cause } finally { loading.value = false }
  }
  const publish = (id: string, definition: AgentOrgDefinition | null): void => {
    const client = getApolloClient()
    const replace = (items: AgentOrgDefinition[]) => definition
      ? items.some(item => item.id === id) ? items.map(item => item.id === id ? definition : item) : [...items, definition]
      : items.filter(item => item.id !== id)
    client.cache.updateQuery<{ agentOrgDefinitions: AgentOrgDefinition[] }>({ query: GetAgentOrgDefinitions }, (cached: { agentOrgDefinitions: AgentOrgDefinition[] } | null) =>
      cached ? { ...cached, agentOrgDefinitions: replace(cached.agentOrgDefinitions) } : cached)
    if (!definition) {
      const entityId = client.cache.identify({ __typename: 'AgentOrgDefinition', id })
      if (entityId) client.cache.evict({ id: entityId })
    }
    definitions.value = replace(definitions.value)
  }
  const create = async (input: AgentOrgDefinitionDraft): Promise<AgentOrgDefinition> => {
    const mutationInput = { ...input, members: toMutationMembers(input.members) }
    const { data, errors } = await getApolloClient().mutate({ mutation: CreateAgentOrgDefinition, fetchPolicy: 'no-cache', variables: { input: mutationInput } })
    if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    const created = mutationDefinition(data?.createAgentOrgDefinition)
    publish(created.id, created)
    return created
  }
  const update = async (id: string, expectedRevision: string, input: Partial<AgentOrgDefinitionDraft>): Promise<AgentOrgDefinition> => {
    const mutationInput = input.members === undefined ? input : { ...input, members: toMutationMembers(input.members) }
    const { data, errors } = await getApolloClient().mutate({ mutation: UpdateAgentOrgDefinition, fetchPolicy: 'no-cache', variables: { input: { id, expectedRevision, ...mutationInput } } })
    if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    const updated = mutationDefinition(data?.updateAgentOrgDefinition, id)
    publish(id, updated)
    return updated
  }
  const remove = async (id: string): Promise<boolean> => {
    const { data, errors } = await getApolloClient().mutate({ mutation: DeleteAgentOrgDefinition, fetchPolicy: 'no-cache', variables: { id } })
    if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    const deleted = data?.deleteAgentOrgDefinition === true
    if (deleted) publish(id, null)
    return deleted
  }
  return { definitions, loading, error, byId, fetchAll, create, update, remove }
})
