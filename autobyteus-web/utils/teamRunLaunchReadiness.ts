import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import {
  buildUnavailableInheritedModelMessage,
  hasExplicitMemberLlmModelOverride,
  resolveEffectiveMemberLlmModelIdentifier,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'

export type TeamRunLaunchBlockingIssueCode =
  | 'WORKSPACE_REQUIRED'
  | 'TEAM_MODEL_REQUIRED'
  | 'TEAM_MODEL_CATALOG_PENDING'
  | 'TEAM_MODEL_UNAVAILABLE'
  | 'MEMBER_MODEL_CATALOG_PENDING'
  | 'MEMBER_MODEL_UNAVAILABLE'
  | 'MEMBER_UNRESOLVED_INHERITED_MODEL'

export interface TeamRunLaunchBlockingIssue {
  code: TeamRunLaunchBlockingIssueCode
  message: string
  memberName?: string
  runtimeKind?: string
}

export interface TeamRunLaunchReadiness {
  canLaunch: boolean
  blockingIssues: TeamRunLaunchBlockingIssue[]
  unresolvedMembers: Array<{
    memberName: string
    runtimeKind: string
    message: string
  }>
}

export type RuntimeModelCatalogs = Record<string, string[]>

const normalizeCatalog = (runtimeModelCatalogs: RuntimeModelCatalogs, runtimeKind: string): string[] | null => {
  const normalizedRuntimeKind = runtimeKind.trim()
  return runtimeModelCatalogs[normalizedRuntimeKind] ?? null
}

export const evaluateTeamRunLaunchReadiness = (
  config: TeamRunConfig | null | undefined,
  runtimeModelCatalogs: RuntimeModelCatalogs,
): TeamRunLaunchReadiness => {
  if (!config) {
    return {
      canLaunch: false,
      blockingIssues: [],
      unresolvedMembers: [],
    }
  }

  const blockingIssues: TeamRunLaunchBlockingIssue[] = []
  const unresolvedMembers: TeamRunLaunchReadiness['unresolvedMembers'] = []

  if (!config.workspaceId) {
    blockingIssues.push({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace is required to run a team.',
    })
  }

  if (!config.llmModelIdentifier) {
    blockingIssues.push({
      code: 'TEAM_MODEL_REQUIRED',
      message: 'A default team model is required before running this team.',
    })
  }

  const teamCatalog = normalizeCatalog(runtimeModelCatalogs, config.runtimeKind)
  if (!teamCatalog) {
    blockingIssues.push({
      code: 'TEAM_MODEL_CATALOG_PENDING',
      message: `Models for ${runtimeKindToLabel(config.runtimeKind)} are still loading.`,
      runtimeKind: config.runtimeKind,
    })
  } else if (
    config.llmModelIdentifier &&
    !teamCatalog.includes(config.llmModelIdentifier)
  ) {
    blockingIssues.push({
      code: 'TEAM_MODEL_UNAVAILABLE',
      message: `Default team model ${config.llmModelIdentifier} is unavailable for ${runtimeKindToLabel(config.runtimeKind)}.`,
      runtimeKind: config.runtimeKind,
    })
  }

  for (const [memberName, override] of Object.entries(config.memberOverrides || {})) {
    const effectiveRuntimeKind = resolveEffectiveMemberRuntimeKind(override, config.runtimeKind)
    const runtimeCatalog = normalizeCatalog(runtimeModelCatalogs, effectiveRuntimeKind)
    const explicitMemberModelIdentifier = hasExplicitMemberLlmModelOverride(override)
      ? resolveEffectiveMemberLlmModelIdentifier(override, '')
      : ''

    if (!runtimeCatalog) {
      blockingIssues.push({
        code: 'MEMBER_MODEL_CATALOG_PENDING',
        memberName,
        runtimeKind: effectiveRuntimeKind,
        message: `Models for ${runtimeKindToLabel(effectiveRuntimeKind)} are still loading.`,
      })
      continue
    }

    if (explicitMemberModelIdentifier) {
      if (!runtimeCatalog.includes(explicitMemberModelIdentifier)) {
        blockingIssues.push({
          code: 'MEMBER_MODEL_UNAVAILABLE',
          memberName,
          runtimeKind: effectiveRuntimeKind,
          message: `${memberName} model ${explicitMemberModelIdentifier} is unavailable for ${runtimeKindToLabel(effectiveRuntimeKind)}.`,
        })
      }
      continue
    }

    const inheritedModelIdentifier = resolveEffectiveMemberLlmModelIdentifier(undefined, config.llmModelIdentifier)
    if (inheritedModelIdentifier && runtimeCatalog.includes(inheritedModelIdentifier)) {
      continue
    }

    const message = buildUnavailableInheritedModelMessage({
      globalLlmModelIdentifier: config.llmModelIdentifier,
      runtimeKind: effectiveRuntimeKind,
      memberName,
    })

    unresolvedMembers.push({
      memberName,
      runtimeKind: effectiveRuntimeKind,
      message,
    })
    blockingIssues.push({
      code: 'MEMBER_UNRESOLVED_INHERITED_MODEL',
      memberName,
      runtimeKind: effectiveRuntimeKind,
      message,
    })
  }

  return {
    canLaunch: blockingIssues.length === 0,
    blockingIssues,
    unresolvedMembers,
  }
}
