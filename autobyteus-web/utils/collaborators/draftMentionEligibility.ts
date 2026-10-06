import type { CollaboratorMentionCandidate } from '~/services/collaborators/collaboratorCandidatesService'
import { isBuiltInAgentDefinitionId } from '~/utils/agents/builtInAgentDefinitionIds'
import { normalizeDefinitionOwnershipScope } from '~/utils/definitionOwnership'

/**
 * `@` candidates in New chat, before the run exists. Mirrors the server's single owner of `@`
 * eligibility, `CollaboratorCandidatePolicy` (`listCandidates` / `requireEligible` in
 * `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`),
 * so a first message never mentions a definition the server will refuse once the run is created:
 *
 * - eligible: shared Agent definitions that are not built-in, then shared Agent Team definitions,
 *   in catalog order (Agent Orgs never), including the members a Team target will place;
 * - excluded: only the target's own definition (it is the run itself).
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

/** The would-be run's own definition: never mentioned (members it places may be). */
export const draftOwnDefinitionIds = (
  target: DraftMentionTarget,
): Readonly<{ agentDefinitionIds: ReadonlySet<string>; teamDefinitionIds: ReadonlySet<string> }> => ({
  agentDefinitionIds: new Set(target.kind === 'agent' ? [target.agentDefinitionId] : []),
  teamDefinitionIds: new Set(target.kind === 'team' ? [target.teamDefinitionId] : []),
})

export const draftMentionCandidates = (
  target: DraftMentionTarget,
  catalogs: DraftMentionCatalogs,
): CollaboratorMentionCandidate[] => {
  const own = draftOwnDefinitionIds(target)
  const candidates: CollaboratorMentionCandidate[] = []
  for (const agent of catalogs.agents) {
    if (!agent.id || !isShared(agent) || isBuiltInAgentDefinitionId(agent.id) || own.agentDefinitionIds.has(agent.id)) continue
    candidates.push(Object.freeze({ kind: 'agent', definitionId: agent.id, name: agent.name, description: agent.description ?? '' }))
  }
  for (const team of catalogs.teams) {
    if (!team.id || !isShared(team) || own.teamDefinitionIds.has(team.id)) continue
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
