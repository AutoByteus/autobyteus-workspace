import { describe, expect, it } from 'vitest'
import {
  flattenTeamRunAgentMetadata,
  parseTeamRunMetadata,
  toTeamMemberKey,
} from '../runHistoryMetadata'

const buildAgent = (memberRouteKey: string, memberName: string) => ({
  memberKind: 'agent',
  memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberName,
  memberRunId: `${memberRouteKey.replace(/\//g, '-')}-run`,
  runtimeKind: 'autobyteus',
  platformAgentRunId: null,
  agentDefinitionId: `${memberRouteKey}-definition`,
  llmModelIdentifier: 'model-1',
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  llmConfig: null,
  workspaceRootPath: '/tmp/workspace',
})

describe('runHistoryMetadata route-key identity', () => {
  it('uses canonical memberRouteKey without falling back to bare memberName', () => {
    const metadata = parseTeamRunMetadata({
      teamRunId: 'team-1',
      teamDefinitionId: 'delivery-team',
      teamDefinitionName: 'Delivery Team',
      coordinatorMemberRouteKey: 'program_manager',
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:01:00.000Z',
      memberTree: [
        {
          memberKind: 'agent_team',
          memberRouteKey: 'BuildSquad',
          memberPath: ['BuildSquad'],
          memberName: 'BuildSquad',
          memberRunId: 'build-squad-handle',
          teamDefinitionId: 'build-squad',
          teamRunId: 'child-team-1',
          coordinatorMemberRouteKey: 'review_lead',
          memberTree: [
            buildAgent('BuildSquad/review_lead', 'review_lead'),
          ],
        },
        {
          memberKind: 'agent_team',
          memberRouteKey: 'AuditSquad',
          memberPath: ['AuditSquad'],
          memberName: 'AuditSquad',
          memberRunId: 'audit-squad-handle',
          teamDefinitionId: 'audit-squad',
          teamRunId: 'child-team-2',
          coordinatorMemberRouteKey: 'review_lead',
          memberTree: [
            buildAgent('AuditSquad/review_lead', 'review_lead'),
          ],
        },
      ],
    })

    expect(flattenTeamRunAgentMetadata(metadata.memberTree).map(toTeamMemberKey)).toEqual([
      'BuildSquad/review_lead',
      'AuditSquad/review_lead',
    ])
    expect(toTeamMemberKey({ memberRouteKey: '', memberName: 'review_lead' } as any)).toBe('')
  })
})
