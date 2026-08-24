import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamRunConfig, TeamRunConfigurationView } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import { resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'

export type TeamRunLaunchBlockingIssueCode =
  | 'TOPOLOGY_REQUIRED'
  | 'WORKSPACE_REQUIRED'
  | 'MODEL_REQUIRED'
  | 'MODEL_CATALOG_PENDING'
  | 'MODEL_UNAVAILABLE'
export interface TeamRunLaunchBlockingIssue {
  code: TeamRunLaunchBlockingIssueCode
  message: string
  subjectAddress?: AgentTeamAddress
  subjectKind?: 'TEAM' | 'AGENT'
  memberName?: string
  runtimeKind?: string
}
export interface TeamRunLaunchReadiness {
  canLaunch: boolean
  blockingIssues: TeamRunLaunchBlockingIssue[]
  unresolvedMembers: Array<{ memberName: string; runtimeKind: string; message: string }>
}
export type RuntimeModelCatalogs = Record<string, string[]>
const catalogFor = (catalogs: RuntimeModelCatalogs, runtimeKind: string): string[] | null => catalogs[runtimeKind.trim()] ?? null
const ownsWorkspaceSelection = (scope: TeamRunConfigurationView['root']): boolean =>
  scope.address === '/' || Boolean(scope.override && Object.hasOwn(scope.override, 'workspace'))

export const evaluateTeamRunLaunchReadiness = (
  config: TeamRunConfig | null | undefined,
  runtimeModelCatalogs: RuntimeModelCatalogs,
  memberTree?: readonly TeamDefinitionMemberNode[] | null,
): TeamRunLaunchReadiness => {
  if (!config) return { canLaunch: false, blockingIssues: [], unresolvedMembers: [] }
  if (!memberTree) return {
    canLaunch: false,
    blockingIssues: [{ code: 'TOPOLOGY_REQUIRED', message: 'The current Team topology is still loading.' }],
    unresolvedMembers: [],
  }
  const view = resolveTeamRunConfiguration(config, memberTree)
  const subjects = [
    ...Object.values(view.teamsByAddress).map((scope) => ({
      kind: 'TEAM' as const,
      address: scope.address,
      name: scope.displayName,
      config: scope.effectiveConfig,
      validatesWorkspace: ownsWorkspaceSelection(scope),
    })),
    ...Object.values(view.agentsByAddress).map((scope) => ({
      kind: 'AGENT' as const,
      address: scope.address,
      name: scope.displayName,
      config: scope.effectiveConfig,
      validatesWorkspace: false,
    })),
  ]
  const issues: TeamRunLaunchBlockingIssue[] = []
  for (const subject of subjects) {
    const workspaceId = subject.config.workspaceId?.trim() || ''
    const rootPath = subject.config.workspaceMetadata?.workspaceRootPath?.trim() || ''
    if (subject.validatesWorkspace && (!workspaceId || !rootPath)) issues.push({
      code: 'WORKSPACE_REQUIRED',
      subjectAddress: subject.address,
      subjectKind: subject.kind,
      memberName: subject.name,
      message: `${subject.kind === 'TEAM' ? 'Team' : 'Agent'} ${subject.address} needs a workspace before launch.`,
    })
    const runtimeKind = subject.config.runtimeKind
    const model = subject.config.llmModelIdentifier.trim()
    if (!model) {
      issues.push({ code: 'MODEL_REQUIRED', subjectAddress: subject.address, subjectKind: subject.kind, memberName: subject.name, runtimeKind,
        message: `${subject.kind === 'TEAM' ? 'Team' : 'Agent'} ${subject.address} needs a model before launch.` })
      continue
    }
    const catalog = catalogFor(runtimeModelCatalogs, runtimeKind)
    if (!catalog) issues.push({ code: 'MODEL_CATALOG_PENDING', subjectAddress: subject.address, subjectKind: subject.kind, memberName: subject.name, runtimeKind,
      message: `Models for ${runtimeKindToLabel(runtimeKind)} are still loading (${subject.address}).` })
    else if (!catalog.includes(model)) issues.push({ code: 'MODEL_UNAVAILABLE', subjectAddress: subject.address, subjectKind: subject.kind, memberName: subject.name, runtimeKind,
      message: `${model} is unavailable for ${runtimeKindToLabel(runtimeKind)} at ${subject.address}.` })
  }
  const unresolvedMembers = issues.filter((issue) => issue.subjectKind === 'AGENT').map((issue) => ({
    memberName: issue.subjectAddress || issue.memberName || '',
    runtimeKind: issue.runtimeKind || '',
    message: issue.message,
  }))
  return { canLaunch: issues.length === 0, blockingIssues: issues, unresolvedMembers }
}
