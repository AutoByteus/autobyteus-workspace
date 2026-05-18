import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { buildTeamRowsFromContext } from '../runHistoryTeamRows';

describe('runHistoryTeamRows', () => {
  it('uses membership labels instead of agent definition names for active team rows', () => {
    const teamContext = {
      teamRunId: 'team-1',
      currentStatus: AgentTeamStatus.Idle,
      focusedMemberRouteKey: 'program_manager',
      memberTree: [
        {
          memberKind: 'agent',
          memberName: 'program_manager',
          displayName: 'program_manager',
          memberPath: ['program_manager'],
          memberRouteKey: 'program_manager',
          memberRunId: 'program-manager-run',
          agentDefinitionId: 'nested-program-manager',
        },
        {
          memberKind: 'agent_team',
          memberName: 'BuildSquad',
          displayName: 'BuildSquad',
          memberPath: ['BuildSquad'],
          memberRouteKey: 'BuildSquad',
          memberRunId: 'build-squad-run',
          teamDefinitionId: 'build-squad',
          children: [
            {
              memberKind: 'agent',
              memberName: 'review_lead',
              displayName: 'review_lead',
              memberPath: ['BuildSquad', 'review_lead'],
              memberRouteKey: 'BuildSquad/review_lead',
              memberRunId: 'review-lead-run',
              agentDefinitionId: 'nested-review-lead',
            },
          ],
        },
      ],
      leafAgentContextsByRouteKey: new Map([
        [
          'program_manager',
          {
            config: {
              agentDefinitionName: 'Nested Program Manager Agent',
              workspaceId: 'ws-1',
            },
            state: {
              runId: 'program-manager-run',
              currentStatus: AgentStatus.Idle,
              conversation: { createdAt: '2026-05-13T00:00:00.000Z', updatedAt: '' },
            },
          },
        ],
        [
          'BuildSquad/review_lead',
          {
            config: {
              agentDefinitionName: 'Nested Review Lead Agent',
              workspaceId: 'ws-1',
            },
            state: {
              runId: 'review-lead-run',
              currentStatus: AgentStatus.Idle,
              conversation: { createdAt: '2026-05-13T00:00:00.000Z', updatedAt: '' },
            },
          },
        ],
      ]),
    } as any;

    const rows = buildTeamRowsFromContext(
      teamContext,
      'summary',
      '2026-05-13T00:00:00.000Z',
      () => '/workspace',
    );

    expect(rows[0]?.displayName).toBe('program_manager');
    expect(rows[1]?.displayName).toBe('BuildSquad');
    expect(rows[1]?.children[0]?.displayName).toBe('review_lead');
  });
});
