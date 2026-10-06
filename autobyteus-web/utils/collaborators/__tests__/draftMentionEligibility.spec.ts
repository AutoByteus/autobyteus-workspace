import { describe, expect, it } from 'vitest'
import { draftMentionCandidates, draftOwnDefinitionIds } from '../draftMentionEligibility'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'

// Mirrors the server's CollaboratorCandidatePolicy (collaborator-candidate-policy.ts).
const agents = [
  { id: 'autobyteus-daily-assistant', name: 'Daily Assistant', ownershipScope: 'SHARED' },
  { id: 'autobyteus-retrospective-skill-improver', name: 'Retrospective Skill Improver', ownershipScope: 'SHARED' },
  { id: 'designer', name: 'Solution Designer', ownershipScope: 'SHARED' },
  { id: 'reviewer', name: 'Reviewer', ownershipScope: 'SHARED' },
  { id: 'researcher', name: 'Researcher', description: 'Finds things', ownershipScope: 'SHARED' },
  { id: buildTeamLocalAgentDefinitionId('engineering', 'helper'), name: 'Helper', ownershipScope: 'TEAM_LOCAL' },
  { id: 'app-agent', name: 'App Agent', ownershipScope: 'APPLICATION_OWNED' },
]
const teams = [
  {
    id: 'engineering', name: 'Software Engineering Team', ownershipScope: 'SHARED', coordinatorMemberName: 'designer',
    nodes: [
      { memberName: 'designer', ref: 'designer', refScope: 'SHARED' },
      { memberName: 'reviewer', ref: 'reviewer', refScope: 'SHARED' },
      { memberName: 'helper', ref: 'helper', refScope: 'TEAM_LOCAL' },
    ],
  },
  { id: 'product', name: 'Product Team', ownershipScope: 'SHARED', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'researcher' }] },
  { id: 'app-team', name: 'App Team', ownershipScope: 'APPLICATION_OWNED', coordinatorMemberName: 'a', nodes: [{ memberName: 'a', ref: 'app-agent' }] },
]
const ids = (target: Parameters<typeof draftMentionCandidates>[0]) =>
  draftMentionCandidates(target, { agents, teams }).map((candidate) => `${candidate.kind}:${candidate.definitionId}`)

describe('draftMentionCandidates (New chat `@`)', () => {
  it('offers shared, non-built-in agents and shared teams, except the target agent', () => {
    expect(ids({ kind: 'agent', agentDefinitionId: 'researcher' })).toEqual([
      'agent:designer', 'agent:reviewer', 'agent_team:engineering', 'agent_team:product',
    ])
  })

  it('never offers the built-in agents (they mirror the server registry)', () => {
    const offered = ids({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' })
    expect(offered).not.toContain('agent:autobyteus-daily-assistant')
    expect(offered).not.toContain('agent:autobyteus-retrospective-skill-improver')
  })

  it('excludes only a Team target itself: its shared members are offered, team-local ones never are (REQ-005, AC-007)', () => {
    expect(ids({ kind: 'team', teamDefinitionId: 'engineering' })).toEqual([
      'agent:designer', 'agent:reviewer', 'agent:researcher', 'agent_team:product',
    ])
    expect(draftOwnDefinitionIds({ kind: 'team', teamDefinitionId: 'engineering' }))
      .toEqual({ agentDefinitionIds: new Set(), teamDefinitionIds: new Set(['engineering']) })
  })

  it('describes a team candidate with its member count and coordinator, like the server', () => {
    const product = draftMentionCandidates({ kind: 'agent', agentDefinitionId: 'designer' }, { agents, teams })
      .find((candidate) => candidate.definitionId === 'product')
    expect(product).toEqual({ kind: 'agent_team', definitionId: 'product', name: 'Product Team', description: '', memberCount: 1, coordinatorName: 'lead' })
  })
})
