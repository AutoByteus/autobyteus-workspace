import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { CreateAgentOrgRun, RestoreAgentOrgRun, TerminateAgentOrgRun } from '~/graphql/mutations/agentOrgRunMutations'

export type AgentOrgLaunchInput = {
  agentOrgDefinitionId: string
  rootConfiguration: Record<string, unknown>
  teamOverrides: Array<{ address: string; configuration: Record<string, unknown> }>
  agentOverrides: Array<{ address: string; configuration: Record<string, unknown> }>
}

export const useAgentOrgRunStore = defineStore('agentOrgRun', () => {
  const launching = ref(false)
  const terminatingRunIds = ref<ReadonlySet<string>>(new Set())
  const terminationErrors = ref<Record<string, string | null>>({})

  const launch = async (input: AgentOrgLaunchInput): Promise<string> => {
    launching.value = true
    try {
      const { data, errors: gqlErrors } = await getApolloClient().mutate({ mutation: CreateAgentOrgRun, variables: { input } })
      if (gqlErrors?.length) throw new Error(gqlErrors.map((entry: { message: string }) => entry.message).join(', '))
      const result = data?.createAgentOrgRun
      if (!result?.success || !result.agentOrgRunId) throw new Error(result?.message || 'AgentOrg launch failed.')
      return result.agentOrgRunId
    } finally { launching.value = false }
  }

  const restore = async (orgRunId: string): Promise<string> => {
    const { data, errors: gqlErrors } = await getApolloClient().mutate({ mutation: RestoreAgentOrgRun, variables: { agentOrgRunId: orgRunId } })
    if (gqlErrors?.length) throw new Error(gqlErrors.map((entry: { message: string }) => entry.message).join(', '))
    const result = data?.restoreAgentOrgRun
    if (!result?.success || !result.agentOrgRunId) throw new Error(result?.message || 'AgentOrg restore failed.')
    return result.agentOrgRunId
  }

  const terminate = async (orgRunId: string): Promise<void> => {
    if (terminatingRunIds.value.has(orgRunId)) return
    terminatingRunIds.value = new Set([...terminatingRunIds.value, orgRunId])
    terminationErrors.value = { ...terminationErrors.value, [orgRunId]: null }
    try {
      const { data, errors: gqlErrors } = await getApolloClient().mutate({ mutation: TerminateAgentOrgRun, variables: { agentOrgRunId: orgRunId } })
      if (gqlErrors?.length) throw new Error(gqlErrors.map((entry: { message: string }) => entry.message).join(', '))
      if (!data?.terminateAgentOrgRun?.success) throw new Error(data?.terminateAgentOrgRun?.message || 'AgentOrg termination failed.')
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      terminationErrors.value = { ...terminationErrors.value, [orgRunId]: detail }
      throw cause
    } finally {
      const next = new Set(terminatingRunIds.value)
      next.delete(orgRunId)
      terminatingRunIds.value = next
    }
  }
  return {
    launching, terminatingRunIds, terminationErrors,
    launch, restore, terminate,
  }
})
