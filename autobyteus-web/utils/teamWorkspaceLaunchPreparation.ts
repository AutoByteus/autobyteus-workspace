import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  TeamLaunchDraft,
  TeamLaunchTopologySubject,
  TeamWorkspaceAuthoringState,
  TeamWorkspaceAuthoringView,
  TeamWorkspacePreparationRequest,
} from '~/types/agent/TeamLaunchDraft'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import { indexTeamLaunchTopology, resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'
import { normalizeWorkspaceRootPath } from '~/utils/workspaceMetadata'

export const idleTeamWorkspaceOperation = () => Object.freeze({ status: 'idle' as const, error: null })

export const freezeTeamWorkspaceAuthoring = (
  values: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>,
): Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>> => Object.freeze(
  Object.fromEntries(Object.entries(values).map(([address, value]) => [address, Object.freeze({
    selectionMode: value!.selectionMode,
    newWorkspacePath: value!.newWorkspacePath,
    operation: Object.freeze({ ...value!.operation }),
  })])),
)

export const deriveTeamWorkspaceAuthoringView = (
  draft: TeamLaunchDraft,
  memberTree: readonly TeamDefinitionMemberNode[],
  address: AgentTeamAddress,
): TeamWorkspaceAuthoringView => {
  const effective = resolveTeamRunConfiguration(draft.config, memberTree).teamsByAddress[address]?.effectiveConfig
  if (!effective) throw new Error(`Team launch view is missing '${address}'.`)
  const authoring = draft.teamWorkspaceAuthoringByTeamAddress[address]
  return Object.freeze({
    selection: Object.freeze({
      mode: authoring?.selectionMode ?? 'existing',
      existingWorkspaceId: effective.workspaceId,
      newWorkspacePath: authoring?.newWorkspacePath ?? effective.workspaceRootPath ?? '',
    }),
    operation: authoring?.operation ?? idleTeamWorkspaceOperation(),
  })
}

export const reconcileTeamWorkspaceAuthoringTopology = (
  values: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>,
  memberTree: readonly TeamDefinitionMemberNode[],
): Readonly<{
  values: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>
  repairedAddresses: readonly AgentTeamAddress[]
}> => {
  const teams = indexTeamLaunchTopology(memberTree).teams
  const repaired = new Set<AgentTeamAddress>()
  const retained = Object.fromEntries(Object.entries(values).filter(([address]) => {
    const keep = teams.has(address as AgentTeamAddress)
    if (!keep) repaired.add(address as AgentTeamAddress)
    return keep
  }))
  return Object.freeze({
    values: freezeTeamWorkspaceAuthoring(retained),
    repairedAddresses: Object.freeze([...repaired].sort()),
  })
}

export const buildTeamLaunchTopologySubjects = (
  config: Readonly<TeamRunConfig>,
  memberTree: readonly TeamDefinitionMemberNode[],
): readonly TeamLaunchTopologySubject[] => {
  const subjects: TeamLaunchTopologySubject[] = [{
    address: '/', kind: 'team', definitionId: config.teamDefinitionId,
  }]
  const visit = (node: TeamDefinitionMemberNode): void => {
    if (node.kind === 'agent') {
      subjects.push({ address: node.address, kind: 'agent', definitionId: node.agentDefinitionId })
      return
    }
    subjects.push({ address: node.address, kind: 'team', definitionId: node.teamDefinitionId })
    node.children.forEach(visit)
  }
  memberTree.forEach(visit)
  return Object.freeze(subjects
    .sort((left, right) => left.address.localeCompare(right.address))
    .map((subject) => Object.freeze(subject)))
}

export const teamLaunchTopologyFingerprint = (subjects: readonly TeamLaunchTopologySubject[]): string =>
  JSON.stringify(subjects.map(({ address, kind, definitionId }) => [address, kind, definitionId]))

export const changedTeamLaunchTopologyAddresses = (
  previous: readonly TeamLaunchTopologySubject[],
  current: readonly TeamLaunchTopologySubject[],
): readonly AgentTeamAddress[] => {
  const describe = (subject: TeamLaunchTopologySubject) => `${subject.kind}:${subject.definitionId}`
  const before = new Map(previous.map((subject) => [subject.address, describe(subject)]))
  const after = new Map(current.map((subject) => [subject.address, describe(subject)]))
  return Object.freeze([...new Set([...before.keys(), ...after.keys()])]
    .filter((address) => before.get(address) !== after.get(address))
    .sort())
}

export const buildTeamWorkspacePreparationRequests = (
  values: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>,
): Readonly<{
  requests: readonly TeamWorkspacePreparationRequest[]
  emptyPathAddresses: readonly AgentTeamAddress[]
}> => {
  const byRootPath = new Map<string, AgentTeamAddress[]>()
  const emptyPathAddresses: AgentTeamAddress[] = []
  for (const [rawAddress, value] of Object.entries(values)) {
    if (value?.selectionMode !== 'new') continue
    const address = rawAddress as AgentTeamAddress
    const rootPath = normalizeWorkspaceRootPath(value.newWorkspacePath)
    if (!rootPath) {
      emptyPathAddresses.push(address)
      continue
    }
    const addresses = byRootPath.get(rootPath) ?? []
    addresses.push(address)
    byRootPath.set(rootPath, addresses)
  }
  const requests = [...byRootPath.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rootPath, addresses]) => Object.freeze({
      rootPath,
      teamAddresses: Object.freeze([...addresses].sort()),
    }))
  return Object.freeze({
    requests: Object.freeze(requests),
    emptyPathAddresses: Object.freeze(emptyPathAddresses.sort()),
  })
}
