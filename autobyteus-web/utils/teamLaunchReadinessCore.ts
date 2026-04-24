import { DEFAULT_AGENT_RUNTIME_KIND, runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { buildUnavailableInheritedModelMessage } from '~/utils/teamRunConfigUtils'

export type TeamLaunchProfileMemberReadinessInput = {
  memberName: string
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
}

export type TeamLaunchReadinessBlockingIssueCode =
  | 'MODEL_CATALOG_PENDING'
  | 'MODEL_REQUIRED'
  | 'MODEL_UNAVAILABLE'
  | 'UNRESOLVED_INHERITED_MODEL'

export type TeamLaunchReadinessBlockingIssue = {
  code: TeamLaunchReadinessBlockingIssueCode
  message: string
  memberName: string
  runtimeKind: string
}

export type TeamLaunchReadiness = {
  canSave: boolean
  blockingIssues: TeamLaunchReadinessBlockingIssue[]
}

export type TeamLaunchProfileRuntimeModelCatalogs = Record<string, string[]>

const normalizeRuntimeKind = (value: string | null | undefined): string => {
  const normalized = (value || '').trim()
  return normalized || DEFAULT_AGENT_RUNTIME_KIND
}

const normalizeModelIdentifier = (value: string | null | undefined): string => (
  typeof value === 'string' ? value.trim() : ''
)

export const evaluateTeamLaunchProfileReadiness = (input: {
  defaultRuntimeKind?: string | null
  defaultLlmModelIdentifier?: string | null
  memberProfiles: TeamLaunchProfileMemberReadinessInput[]
  runtimeModelCatalogs: TeamLaunchProfileRuntimeModelCatalogs
  requireModel: boolean
}): TeamLaunchReadiness => {
  if (!input.requireModel) {
    return {
      canSave: true,
      blockingIssues: [],
    }
  }

  const defaultRuntimeKind = normalizeRuntimeKind(input.defaultRuntimeKind)
  const defaultLlmModelIdentifier = normalizeModelIdentifier(input.defaultLlmModelIdentifier)
  const blockingIssues: TeamLaunchReadinessBlockingIssue[] = []

  input.memberProfiles.forEach((memberProfile) => {
    const effectiveRuntimeKind = normalizeRuntimeKind(memberProfile.runtimeKind || defaultRuntimeKind)
    const runtimeCatalog = input.runtimeModelCatalogs[effectiveRuntimeKind] ?? null
    const explicitModelIdentifier = normalizeModelIdentifier(memberProfile.llmModelIdentifier)
    const effectiveModelIdentifier = explicitModelIdentifier || defaultLlmModelIdentifier

    if (!runtimeCatalog) {
      blockingIssues.push({
        code: 'MODEL_CATALOG_PENDING',
        memberName: memberProfile.memberName,
        runtimeKind: effectiveRuntimeKind,
        message: `Models for ${runtimeKindToLabel(effectiveRuntimeKind)} are still loading.`,
      })
      return
    }

    if (!effectiveModelIdentifier) {
      blockingIssues.push({
        code: 'MODEL_REQUIRED',
        memberName: memberProfile.memberName,
        runtimeKind: effectiveRuntimeKind,
        message: `${memberProfile.memberName} needs a model before this team setup can be saved.`,
      })
      return
    }

    if (runtimeCatalog.includes(effectiveModelIdentifier)) {
      return
    }

    if (explicitModelIdentifier) {
      blockingIssues.push({
        code: 'MODEL_UNAVAILABLE',
        memberName: memberProfile.memberName,
        runtimeKind: effectiveRuntimeKind,
        message: `${memberProfile.memberName} model ${explicitModelIdentifier} is unavailable for ${runtimeKindToLabel(effectiveRuntimeKind)}.`,
      })
      return
    }

    blockingIssues.push({
      code: 'UNRESOLVED_INHERITED_MODEL',
      memberName: memberProfile.memberName,
      runtimeKind: effectiveRuntimeKind,
      message: buildUnavailableInheritedModelMessage({
        globalLlmModelIdentifier: defaultLlmModelIdentifier,
        runtimeKind: effectiveRuntimeKind,
        memberName: memberProfile.memberName,
      }),
    })
  })

  return {
    canSave: blockingIssues.length === 0,
    blockingIssues,
  }
}
