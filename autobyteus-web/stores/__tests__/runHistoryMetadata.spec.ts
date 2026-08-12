import { describe, expect, it } from 'vitest'
import {
  flattenTeamRunAgentMetadata,
  parseTeamRunMetadata,
  toTeamMemberKey,
} from '../runHistoryMetadata'

const buildAgent = (address: string) => ({
  kind: 'agent',
  address,
  role: null,
  description: null,
  agentRunId: `${address.replace(/\//g, '-')}-run`,
  runtimeKind: 'autobyteus',
  platformAgentRunId: null,
  agentDefinitionId: `${address}-definition`,
  llmModelIdentifier: 'model-1',
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  llmConfig: null,
  workspaceRootPath: '/tmp/workspace',
  applicationExecutionContext: null,
})

const buildSubTeam = (address: string, teamRunId: string) => ({
  kind: 'agent_team',
  address,
  role: null,
  description: null,
  teamDefinitionId: `${address}-definition`,
  teamRunId,
  coordinatorAddress: `${address}/review_lead`,
  children: [buildAgent(`${address}/review_lead`)],
})

describe('runHistoryMetadata canonical address identity', () => {
  it('keeps same-named leaves distinct by exact rooted address without a bare-name fallback', () => {
    const metadata = parseTeamRunMetadata({
      schemaVersion: 3,
      teamDefinitionName: 'Delivery Team',
      createdAt: '2026-05-17T00:00:00.000Z',
      archivedAt: null,
      rootTeam: {
        kind: 'agent_team',
        address: '/',
        teamDefinitionId: 'delivery-team',
        teamRunId: 'team-1',
        coordinatorAddress: '/BuildSquad/review_lead',
        children: [
          buildSubTeam('/BuildSquad', 'child-team-1'),
          buildSubTeam('/AuditSquad', 'child-team-2'),
        ],
      },
      handoffs: [],
    })

    expect(flattenTeamRunAgentMetadata(metadata.rootTeam.children).map(toTeamMemberKey)).toEqual([
      '/BuildSquad/review_lead',
      '/AuditSquad/review_lead',
    ])
    expect(toTeamMemberKey({ address: '' })).toBe('')
  })
})
