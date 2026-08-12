import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

describe('useMobileWorkCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('maps query-shaped team runs from createdAt and binary activity without legacy team status fields', () => {
    const teamRun = {
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team-1',
      teamDefinitionName: 'Software Team',
      coordinatorAddress: '/lead',
      summary: 'Implement mobile QR scanning',
      createdAt: '2026-05-21T17:00:00.000Z',
      isActive: false,
      members: [
        {
          memberAddress: '/lead',
          displayName: 'lead',
          agentRunId: 'lead-run',
          status: AgentStatus.Idle,
        },
        {
          memberAddress: '/reviewer',
          displayName: 'reviewer',
          agentRunId: 'reviewer-run',
          status: AgentStatus.Offline,
        },
      ],
      rootTeam: {
        kind: 'agent_team',
        address: '/',
        teamDefinitionId: 'team-1',
        teamRunId: 'team-run-1',
        coordinatorAddress: '/lead',
        children: [],
      },
    };
    const workspaceGroups: RunHistoryWorkspaceGroup[] = [
      {
        workspaceRootPath: '/Users/normy/project',
        workspaceName: 'project',
        agentDefinitions: [],
        teamDefinitions: [
          {
            teamDefinitionId: 'team-1',
            teamDefinitionName: 'Software Team',
            runs: [teamRun],
          },
        ],
      },
    ];
    useRunHistoryStore().workspaceGroups = workspaceGroups;
    useMobileWorkStore().rememberFocusedTeamMember('team-run-1', createTeamExecutionAddress({
      rootTeamRunId: 'team-run-1',
      memberAddress: '/reviewer',
    }));

    const { recentWorkItems } = useMobileWorkCatalog();

    expect(recentWorkItems.value).toHaveLength(1);
    const item = recentWorkItems.value[0];
    expect(item.meta).toContain('Inactive');
    expect(item.context.kind).toBe('team-run');
    if (item.context.kind === 'team-run') {
      expect(item.context.lastActivityAt).toBe(teamRun.createdAt);
      expect(item.context.statusLabel).toBe('Inactive');
      expect(item.context.focusedExecutionAddress).toEqual(createTeamExecutionAddress({
        rootTeamRunId: 'team-run-1',
        memberAddress: '/reviewer',
      }));
    }
    expect('lastActivityAt' in teamRun).toBe(false);
    expect('lastKnownStatus' in teamRun).toBe(false);
  });

  it('uses guarded activity sort keys when a malformed run context lacks an activity timestamp', () => {
    useRunHistoryStore().workspaceGroups = [
      {
        workspaceRootPath: '/Users/normy/project',
        workspaceName: 'project',
        agentDefinitions: [
          {
            agentDefinitionId: 'agent-1',
            agentName: 'Builder Agent',
            runs: [
              {
                runId: 'run-1',
                summary: 'Malformed historical run',
                createdAt: undefined as unknown as string,
                status: AgentStatus.Idle,
                isActive: false,
              },
            ],
          },
        ],
        teamDefinitions: [],
      },
    ];

    const { recentWorkItems } = useMobileWorkCatalog();

    expect(() => recentWorkItems.value).not.toThrow();
    expect(recentWorkItems.value[0]?.context.kind).toBe('agent-run');
  });
});
