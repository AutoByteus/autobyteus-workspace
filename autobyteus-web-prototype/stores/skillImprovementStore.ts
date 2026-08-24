import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GetAgentRunSkillImprovementEligibility,
  GetSkillImprovementRunRecord,
  GetTeamMemberSkillImprovementEligibility,
} from '~/graphql/queries/skillImprovementQueries'
import {
  StartAgentRunSkillImprovement,
  StartTeamMemberSkillImprovement,
} from '~/graphql/mutations/skillImprovementMutations'
import type { SkillImprovementEffectiveConfig } from '~/types/agent/SkillImprovementConfig'

export interface SkillImprovementSkillTarget {
  skillName: string
  skillRootPath: string
  skillMdPath: string
  sourceLabel?: string | null
  isWritable: boolean
}

export interface SkillImprovementEligibility {
  eligible: boolean
  reasons: string[]
  warnings: string[]
  skillTargets: SkillImprovementSkillTarget[]
  effectiveConfig?: SkillImprovementEffectiveConfig | null
}

export interface SkillImprovementRunRecordSummary {
  improvementRunId: string
  status: string
  improverRunId?: string | null
  errors: string[]
}

interface AgentEligibilityResult {
  getAgentRunSkillImprovementEligibility?: SkillImprovementEligibility | null
}

interface TeamMemberEligibilityResult {
  getTeamMemberSkillImprovementEligibility?: SkillImprovementEligibility | null
}

interface StartResult {
  improvementRunId: string
  improverRunId?: string | null
  record: SkillImprovementRunRecordSummary
}

interface StartAgentResult {
  startAgentRunSkillImprovement?: StartResult | null
}

interface StartTeamMemberResult {
  startTeamMemberSkillImprovement?: StartResult | null
}

interface RunRecordResult {
  getSkillImprovementRunRecord?: SkillImprovementRunRecordSummary | null
}

export const useSkillImprovementStore = defineStore('skillImprovement', () => {
  const eligibilityByKey = ref<Record<string, SkillImprovementEligibility>>({})
  const recordsById = ref<Record<string, SkillImprovementRunRecordSummary>>({})
  const loadingKeys = ref<Record<string, boolean>>({})
  const errorByKey = ref<Record<string, string>>({})

  const agentKey = (runId: string): string => `agent:${runId}`
  const teamMemberKey = (teamRunId: string, agentRunId: string): string => `team-member:${teamRunId}:${agentRunId}`

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

  const fetchAgentRunEligibility = async (runId: string): Promise<SkillImprovementEligibility> => {
    const key = agentKey(runId)
    setLoading(key, true)
    clearError(key)
    try {
      const { data, errors } = await getApolloClient().query<AgentEligibilityResult>({
        query: GetAgentRunSkillImprovementEligibility,
        variables: { runId },
        fetchPolicy: 'network-only',
      })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const eligibility = data.getAgentRunSkillImprovementEligibility
      if (!eligibility) {
        throw new Error('Skill Improvement eligibility was not returned.')
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

  const fetchTeamMemberEligibility = async (teamRunId: string, agentRunId: string): Promise<SkillImprovementEligibility> => {
    const key = teamMemberKey(teamRunId, agentRunId)
    setLoading(key, true)
    clearError(key)
    try {
      const { data, errors } = await getApolloClient().query<TeamMemberEligibilityResult>({
        query: GetTeamMemberSkillImprovementEligibility,
        variables: { teamRunId, agentRunId },
        fetchPolicy: 'network-only',
      })
      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }
      const eligibility = data.getTeamMemberSkillImprovementEligibility
      if (!eligibility) {
        throw new Error('Skill Improvement eligibility was not returned.')
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

  const startAgentRunSkillImprovement = async (runId: string): Promise<StartResult> => {
    const { data, errors } = await getApolloClient().mutate<StartAgentResult>({
      mutation: StartAgentRunSkillImprovement,
      variables: { input: { runId } },
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const result = data?.startAgentRunSkillImprovement
    if (!result) {
      throw new Error('Skill Improvement start result was not returned.')
    }
    recordsById.value = { ...recordsById.value, [result.improvementRunId]: result.record }
    return result
  }

  const startTeamMemberSkillImprovement = async (teamRunId: string, agentRunId: string): Promise<StartResult> => {
    const { data, errors } = await getApolloClient().mutate<StartTeamMemberResult>({
      mutation: StartTeamMemberSkillImprovement,
      variables: { input: { teamRunId, agentRunId } },
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const result = data?.startTeamMemberSkillImprovement
    if (!result) {
      throw new Error('Skill Improvement start result was not returned.')
    }
    recordsById.value = { ...recordsById.value, [result.improvementRunId]: result.record }
    return result
  }

  const fetchRunRecord = async (improvementRunId: string): Promise<SkillImprovementRunRecordSummary | null> => {
    const { data, errors } = await getApolloClient().query<RunRecordResult>({
      query: GetSkillImprovementRunRecord,
      variables: { improvementRunId },
      fetchPolicy: 'network-only',
    })
    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }
    const record = data.getSkillImprovementRunRecord ?? null
    if (record) {
      recordsById.value = { ...recordsById.value, [record.improvementRunId]: record }
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
    startAgentRunSkillImprovement,
    startTeamMemberSkillImprovement,
    fetchRunRecord,
  }
})
