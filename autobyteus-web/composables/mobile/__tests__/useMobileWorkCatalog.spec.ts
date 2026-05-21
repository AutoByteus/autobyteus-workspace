import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

describe('useMobileWorkCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('maps query-shaped team runs from createdAt and status without legacy team fields', () => {
    const teamRun = {
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team-1',
      teamDefinitionName: 'Software Team',
      coordinatorMemberRouteKey: 'lead',
      summary: 'Implement mobile QR scanning',
      createdAt: '2026-05-21T17:00:00.000Z',
      status: AgentTeamStatus.Idle,
      isActive: false,
      members: [
        {
          memberRouteKey: 'lead',
          memberName: 'lead',
          memberRunId: 'lead-run',
          status: AgentStatus.Idle,
        },
        {
          memberRouteKey: 'reviewer',
          memberName: 'reviewer',
          memberRunId: 'reviewer-run',
          status: AgentStatus.Offline,
        },
      ],
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
    useMobileWorkStore().rememberFocusedTeamMember('team-run-1', 'reviewer');

    const { recentWorkItems } = useMobileWorkCatalog();

    expect(recentWorkItems.value).toHaveLength(1);
    const item = recentWorkItems.value[0];
    expect(item.meta).toContain('Idle');
    expect(item.context.kind).toBe('team-run');
    if (item.context.kind === 'team-run') {
      expect(item.context.lastActivityAt).toBe(teamRun.createdAt);
      expect(item.context.statusLabel).toBe('Idle');
      expect(item.context.focusedMemberRouteKey).toBe('reviewer');
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
