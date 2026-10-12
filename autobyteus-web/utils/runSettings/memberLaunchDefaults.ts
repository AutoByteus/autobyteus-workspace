import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import {
  usableStartCandidate,
  type StartCandidateUnusableReason,
  type StartModelCandidate,
  type StartModelCatalog,
  type StartModelChoice,
} from '~/utils/runSettings/startModelDefaults'

/** A member row whose own configured default cannot be used here: it follows its parent instead (REQ-009). */
export type MemberLaunchNote = Readonly<{
  runtimeKind: string | null
  llmModelIdentifier: string | null
  reason: StartCandidateUnusableReason
}>

export type MemberLaunchSeed = Readonly<{
  /** Agents (Team members, Org direct agents, placed-team members) seeded from their agent default. */
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  /** Org placed teams seeded from their team default. */
  teamOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  notes: Readonly<Record<AgentTeamAddress, MemberLaunchNote>>
}>

export type MemberLaunchSeedInput = Readonly<{
  members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string }>[]
  placedTeams?: readonly Readonly<{ address: AgentTeamAddress; teamDefinitionId: string }>[]
  getAgentDefault(agentDefinitionId: string): StartModelCandidate | null
  getTeamDefault?(teamDefinitionId: string): StartModelCandidate | null
  catalog: StartModelCatalog
  /** The model config a seeded row holds (e.g. the model's defaults made explicit, as the root does). */
  modelConfigFor(choice: StartModelChoice): Record<string, unknown> | null
}>

/**
 * DS-006: on a fresh team or Org start, each agent (and each Org placed team) with a usable own
 * default gets it as its row's own runtime, model and settings, by the start-default rule but
 * without the "default runtime's first model" fallback. A row whose default is unusable gets a note
 * and follows its parent. Only the runtimes named by these defaults are loaded. The caller pins the
 * seeded addresses so a later root change does not move them (DEC-009, REQ-010).
 */
export const seedMemberLaunchDefaults = async (input: MemberLaunchSeedInput): Promise<MemberLaunchSeed> => {
  const targets = [
    ...input.members.map((member) => ({ kind: 'agent' as const, address: member.address, candidate: input.getAgentDefault(member.agentDefinitionId) })),
    ...(input.placedTeams ?? []).map((team) => ({ kind: 'team' as const, address: team.address, candidate: input.getTeamDefault?.(team.teamDefinitionId) ?? null })),
  ].filter((target): target is typeof target & { candidate: StartModelCandidate } => target.candidate !== null)
  const agentOverrides: Record<AgentTeamAddress, AgentConfigOverride> = {}
  const teamOverrides: Record<AgentTeamAddress, AgentConfigOverride> = {}
  const notes: Record<AgentTeamAddress, MemberLaunchNote> = {}
  if (!targets.length) return { agentOverrides, teamOverrides, notes }
  await input.catalog.ensureAvailability()
  const verdicts = await Promise.all(targets.map((target) => usableStartCandidate(target.candidate, input.catalog)))
  targets.forEach((target, index) => {
    const verdict = verdicts[index]!
    if (!verdict.usable) {
      notes[target.address] = {
        runtimeKind: target.candidate.runtimeKind ?? null,
        llmModelIdentifier: target.candidate.llmModelIdentifier ?? null,
        reason: verdict.reason,
      }
      return
    }
    const { choice } = verdict
    const override = { runtimeKind: choice.runtimeKind, llmModelIdentifier: choice.llmModelIdentifier, llmConfig: input.modelConfigFor(choice) }
    if (target.kind === 'team') teamOverrides[target.address] = override
    else agentOverrides[target.address] = override
  })
  return { agentOverrides, teamOverrides, notes }
}

/** The addresses a seed pins: every seeded row (agents and placed teams). */
export const seededAddresses = (seed: MemberLaunchSeed): AgentTeamAddress[] =>
  [...Object.keys(seed.teamOverrides), ...Object.keys(seed.agentOverrides)]

/** An Org launch's seed targets: direct agents, placed teams and each placed team's agents, at their addresses. */
export const orgMemberSeedTargets = (
  org: Pick<AgentOrgDefinition, 'members'>,
  references: Readonly<{ teams: Readonly<Record<string, Pick<AgentTeamDefinition, 'id' | 'nodes'>>> }>,
): Pick<MemberLaunchSeedInput, 'members' | 'placedTeams'> => {
  const members: { address: AgentTeamAddress; agentDefinitionId: string }[] = []
  const placedTeams: { address: AgentTeamAddress; teamDefinitionId: string }[] = []
  for (const member of org.members) {
    const address: AgentTeamAddress = `/${member.memberName}`
    if (member.refType === 'AGENT') { members.push({ address, agentDefinitionId: member.ref }); continue }
    placedTeams.push({ address, teamDefinitionId: member.ref })
    const team = references.teams[member.ref]
    for (const node of team?.nodes ?? []) {
      members.push({
        address: `${address}/${node.memberName}`,
        agentDefinitionId: node.refScope === 'TEAM_LOCAL' ? buildTeamLocalAgentDefinitionId(team!.id, node.ref) : node.ref,
      })
    }
  }
  return { members, placedTeams }
}
