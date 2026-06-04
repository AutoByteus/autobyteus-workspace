import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GetAgentRunSelfEvolutionEligibility,
  GetSelfEvolutionRunRecord,
  GetTeamMemberSelfEvolutionEligibility,
} from '~/graphql/queries/selfEvolutionQueries'
import {
  StartAgentRunSelfEvolution,
  StartTeamMemberSelfEvolution,
} from '~/graphql/mutations/selfEvolutionMutations'
import type { SelfEvolutionEffectiveConfig } from '~/types/agent/SelfEvolutionConfig'

export interface SelfEvolutionSkillTarget {
  skillName: string
  skillRootPath: string
  skillMdPath: string
  sourceLabel?: string | null
  isWritable: boolean
  gitRootPath?: string | null
  rollbackMode: 'git' | 'unversioned' | 'none'
}

export interface SelfEvolutionEligibility {
  eligible: boolean
  reasons: string[]
  warnings: string[]
  skillTargets: SelfEvolutionSkillTarget[]
  effectiveConfig?: SelfEvolutionEffectiveConfig | null
}

export interface SelfEvolutionRunRecordSummary {
  evolutionRunId: string
  status: string
  evolverRunId?: string | null
  errors: string[]
}

interface AgentEligibilityResult {
  getAgentRunSelfEvolutionEligibility?: SelfEvolutionEligibility | null
}

interface TeamMemberEligibilityResult {
  getTeamMemberSelfEvolutionEligibility?: SelfEvolutionEligibility | null
}

interface StartResult {
  evolutionRunId: string
  evolverRunId?: string | null
  record: SelfEvolutionRunRecordSummary
}

interface StartAgentResult {
  startAgentRunSelfEvolution?: StartResult | null
}

interface StartTeamMemberResult {
  startTeamMemberSelfEvolution?: StartResult | null
}

interface RunRecordResult {
  getSelfEvolutionRunRecord?: SelfEvolutionRunRecordSummary | null
}

export const useSelfEvolutionStore = defineStore('selfEvolution', () => {
  const eligibilityByKey = ref<Record<string, SelfEvolutionEligibility>>({})
  const recordsById = ref<Record<string, SelfEvolutionRunRecordSummary>>({})
  const loadingKeys = ref<Record<string, boolean>>({})
  const errorByKey = ref<Record<string, string>>({})

  const agentKey = (runId: string): string => `agent:${runId}`
  const teamMemberKey = (teamRunId: string, memberRunId: string): string => `team-member:${teamRunId}:${memberRunId}`

  const setLoading = (key: string, loading: boolean): void => {
    loadingKeys.value = { ...loadingKeys.value, [key]: loading }
  }

  const setError = (key: string, error: unknown): void => {
    errorByKey.value = { ...errorByKey.value, [key]: error instanceof Error ? error.message : String(error) }
  }

  const clearError = (key: string): void => {
    const next = { ...errorByKey.value }
    delete next[key]
    errorByKey.value = next
  }

  const fetchAgentRunEligibility = async (runId: string): Promise<SelfEvolutionEligibility> => {
    const key = agentKey(runId)
    setLoading(key, true)
    clearError(key)
    try {
      const { data, errors } = await getApolloClient().query<AgentEligibilityResult>({
        query: GetAgentRunSelfEvolutionEligibility,
        variables: { runId },
        fetchPolicy: 'network-only',
      })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const eligibility = data.getAgentRunSelfEvolutionEligibility
      if (!eligibility) {
        throw new Error('Self-evolution eligibility was not returned.')
      }
      eligibilityByKey.value = { ...eligibilityByKey.value, [key]: eligibility }
      return eligibility
    } catch (error) {
      setError(key, error)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const fetchTeamMemberEligibility = async (teamRunId: string, memberRunId: string): Promise<SelfEvolutionEligibility> => {
    const key = teamMemberKey(teamRunId, memberRunId)
    setLoading(key, true)
    clearError(key)
    try {
      const { data, errors } = await getApolloClient().query<TeamMemberEligibilityResult>({
        query: GetTeamMemberSelfEvolutionEligibility,
        variables: { teamRunId, memberRunId },
        fetchPolicy: 'network-only',
      })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const eligibility = data.getTeamMemberSelfEvolutionEligibility
      if (!eligibility) {
        throw new Error('Self-evolution eligibility was not returned.')
      }
      eligibilityByKey.value = { ...eligibilityByKey.value, [key]: eligibility }
      return eligibility
    } catch (error) {
      setError(key, error)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const startAgentRunSelfEvolution = async (runId: string): Promise<StartResult> => {
    const { data, errors } = await getApolloClient().mutate<StartAgentResult>({
      mutation: StartAgentRunSelfEvolution,
      variables: { input: { runId } },
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const result = data?.startAgentRunSelfEvolution
    if (!result) {
      throw new Error('Self-evolution start result was not returned.')
    }
    recordsById.value = { ...recordsById.value, [result.evolutionRunId]: result.record }
    return result
  }

  const startTeamMemberSelfEvolution = async (teamRunId: string, memberRunId: string): Promise<StartResult> => {
    const { data, errors } = await getApolloClient().mutate<StartTeamMemberResult>({
      mutation: StartTeamMemberSelfEvolution,
      variables: { input: { teamRunId, memberRunId } },
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const result = data?.startTeamMemberSelfEvolution
    if (!result) {
      throw new Error('Self-evolution start result was not returned.')
    }
    recordsById.value = { ...recordsById.value, [result.evolutionRunId]: result.record }
    return result
  }

  const fetchRunRecord = async (evolutionRunId: string): Promise<SelfEvolutionRunRecordSummary | null> => {
    const { data, errors } = await getApolloClient().query<RunRecordResult>({
      query: GetSelfEvolutionRunRecord,
      variables: { evolutionRunId },
      fetchPolicy: 'network-only',
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const record = data.getSelfEvolutionRunRecord ?? null
    if (record) {
      recordsById.value = { ...recordsById.value, [record.evolutionRunId]: record }
    }
    return record
  }

  return {
    eligibilityByKey,
    recordsById,
    loadingKeys,
    errorByKey,
    agentKey,
    teamMemberKey,
    fetchAgentRunEligibility,
    fetchTeamMemberEligibility,
    startAgentRunSelfEvolution,
    startTeamMemberSelfEvolution,
    fetchRunRecord,
  }
})
