import type { CollaboratorMentionCandidate } from '~/services/collaborators/collaboratorCandidatesService'
import { isBuiltInAgentDefinitionId } from '~/utils/agents/builtInAgentDefinitionIds'
import { normalizeDefinitionOwnershipScope } from '~/utils/definitionOwnership'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'

/**
 * `@` candidates in New chat, before the run exists. Mirrors the server's single owner of `@`
 * eligibility, `CollaboratorCandidatePolicy` (`listCandidates` / `requireAdmissible` /
 * `inRunDefinitionIds` in `autobyteus-server-ts/src/agent-collaboration/collaborators/
 * collaborator-candidate-policy.ts`), so a first message never mentions a definition the server
 * will refuse once the run is created:
 *
 * - eligible: shared Agent definitions that are not built-in, then shared Agent Team definitions,
 *   in catalog order (Agent Orgs never);
 * - in the would-be run (excluded): the target's own definition and, for a Team target, every
 *   definition placed in it.
 */
export type DraftMentionTarget =
  | Readonly<{ kind: 'agent'; agentDefinitionId: string }>
  | Readonly<{ kind: 'team'; teamDefinitionId: string }>

type OwnedDefinition = Readonly<{ id: string; name: string; description?: string | null; ownershipScope?: string | null }>
export type DraftMentionAgentDefinition = OwnedDefinition
export type DraftMentionTeamDefinition = OwnedDefinition & Readonly<{
  coordinatorMemberName: string
  nodes: readonly Readonly<{ memberName: string; ref: string; refScope?: string | null }>[]
}>

export type DraftMentionCatalogs = Readonly<{
  agents: readonly DraftMentionAgentDefinition[]
  teams: readonly DraftMentionTeamDefinition[]
}>

const isShared = (definition: OwnedDefinition): boolean =>
  normalizeDefinitionOwnershipScope(definition.ownershipScope) === 'SHARED'

/** The definitions the would-be run already places: they cannot be brought in. */
export const draftInRunDefinitionIds = (
  target: DraftMentionTarget,
  catalogs: DraftMentionCatalogs,
): Readonly<{ agentDefinitionIds: ReadonlySet<string>; teamDefinitionIds: ReadonlySet<string> }> => {
  const agents = new Set<string>()
  const teams = new Set<string>()
  if (target.kind === 'agent') {
    agents.add(target.agentDefinitionId)
  } else {
    teams.add(target.teamDefinitionId)
    const team = catalogs.teams.find((entry) => entry.id === target.teamDefinitionId)
    // Teams are flat: every placement is an Agent (shared, or local to this team).
    for (const node of team?.nodes ?? []) {
      agents.add(normalizeDefinitionOwnershipScope(node.refScope) === 'TEAM_LOCAL'
        ? buildTeamLocalAgentDefinitionId(team!.id, node.ref)
        : node.ref.trim())
    }
  }
  return { agentDefinitionIds: agents, teamDefinitionIds: teams }
}

export const draftMentionCandidates = (
  target: DraftMentionTarget,
  catalogs: DraftMentionCatalogs,
): CollaboratorMentionCandidate[] => {
  const inRun = draftInRunDefinitionIds(target, catalogs)
  const candidates: CollaboratorMentionCandidate[] = []
  for (const agent of catalogs.agents) {
    if (!agent.id || !isShared(agent) || isBuiltInAgentDefinitionId(agent.id) || inRun.agentDefinitionIds.has(agent.id)) continue
    candidates.push(Object.freeze({ kind: 'agent', definitionId: agent.id, name: agent.name, description: agent.description ?? '' }))
  }
  for (const team of catalogs.teams) {
    if (!team.id || !isShared(team) || inRun.teamDefinitionIds.has(team.id)) continue
    candidates.push(Object.freeze({
      kind: 'agent_team',
      definitionId: team.id,
      name: team.name,
      description: team.description ?? '',
      memberCount: team.nodes.length,
      coordinatorName: team.coordinatorMemberName,
    }))
  }
  return candidates
}
