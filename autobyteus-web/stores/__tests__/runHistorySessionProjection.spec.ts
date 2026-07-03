import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { resolveWorkspaceHistorySessionDisplayLabel } from '../runHistorySessionLabels';
import { buildWorkspaceHistorySessionRows } from '../runHistorySessionProjection';

const workspaceNode = {
  workspaceId: 'workspace-a',
  workspaceRootPath: '/ws/a',
  workspaceName: 'Workspace A',
  workspaceKind: 'filesystem' as const,
  canRemoveFromWorkspaces: true,
  agents: [
    {
      agentDefinitionId: 'agent-def-1',
      agentName: 'Daily Assistant',
      agentAvatarUrl: 'https://example.com/agent.png',
      runs: [
        {
          runId: 'agent-old',
          summary: 'Older agent task',
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          currentStatus: AgentStatus.Offline,
          lastKnownStatus: 'IDLE' as const,
          isActive: false,
          source: 'history' as const,
          isDraft: false,
        },
        {
          runId: 'agent-active',
          summary: '**[User Requirement]** Active agent task',
          lastActivityAt: '2026-01-01T00:01:00.000Z',
          currentStatus: AgentStatus.Running,
          lastKnownStatus: 'ACTIVE' as const,
          isActive: true,
          source: 'local' as const,
          isDraft: false,
        },
      ],
    },
  ],
};

const buildTeam = (overrides: Record<string, unknown> = {}) => ({
  teamRunId: 'team-recent',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Software Engineering Team',
  workspaceRootPath: '/ws/a',
  summary: 'Recent team task',
  lastActivityAt: '2026-01-01T00:05:00.000Z',
  lastKnownStatus: 'IDLE' as const,
  isActive: false,
  currentStatus: AgentTeamStatus.Offline,
  deleteLifecycle: 'READY' as const,
  focusedMemberRouteKey: 'solution_designer',
  members: [
    {
      teamRunId: 'team-recent',
      memberKind: 'agent' as const,
      memberRouteKey: 'solution_designer',
      memberPath: ['solution_designer'],
      memberName: 'solution_designer',
      displayName: 'Solution Designer',
      memberRunId: 'member-run-sd',
      workspaceRootPath: '/ws/a',
      summary: 'Recent team task',
      lastActivityAt: '2026-01-01T00:05:00.000Z',
      currentStatus: AgentStatus.Offline,
      lastKnownStatus: 'IDLE' as const,
      isActive: false,
      deleteLifecycle: 'READY' as const,
      children: [],
    },
  ],
  memberTree: [],
  ...overrides,
});

describe('runHistorySessionLabels', () => {
  it('prefers explicit titles before sanitized summary fallback', () => {
    expect(resolveWorkspaceHistorySessionDisplayLabel({
      kind: 'agent',
      explicitTitle: '  Improve session history navigation  ',
      summary: 'Raw prompt summary',
      sourceName: 'Daily Assistant',
    })).toMatchObject({
      title: 'Improve session history navigation',
      subtitle: 'Daily Assistant · agent session',
      rawSummary: 'Raw prompt summary',
      titleSource: 'explicit',
    });
  });

  it('strips prompt wrappers and falls back when title content is blank', () => {
    expect(resolveWorkspaceHistorySessionDisplayLabel({
      kind: 'team',
      explicitTitle: ' **[User Requirement]** ',
      summary: '**[User Requirement]**   Build the demo fruit shop',
      sourceName: 'Software Engineering Team',
      memberCount: 7,
    })).toMatchObject({
      title: 'Build the demo fruit shop',
      subtitle: 'Software Engineering Team (7)',
      titleSource: 'summary',
    });

    expect(resolveWorkspaceHistorySessionDisplayLabel({
      kind: 'team',
      summary: '[User Requirement]',
      sourceName: 'Team Alpha',
    })).toMatchObject({
      title: 'Untitled team session',
      titleSource: 'fallback',
    });
  });
});

describe('runHistorySessionProjection', () => {
  it('merges agent and team runs into direct session rows sorted active-first then recent', () => {
    const rows = buildWorkspaceHistorySessionRows({
      workspaceNode,
      teamNodes: [buildTeam()],
    });

    expect(rows.map((row) => row.sessionKey)).toEqual([
      'agent:agent-active',
      'team:team-recent',
      'agent:agent-old',
    ]);
    expect(rows[0]).toMatchObject({
      kind: 'agent',
      displayLabel: { title: 'Active agent task' },
      source: { sourceName: 'Daily Assistant' },
    });
    expect(rows[1]).toMatchObject({
      kind: 'team',
      displayLabel: {
        title: 'Recent team task',
        subtitle: 'Software Engineering Team (1)',
      },
      source: {
        sourceName: 'Software Engineering Team',
        memberCount: 1,
      },
    });
  });

  it('threads explicit session titles from source rows before summary fallback', () => {
    const rows = buildWorkspaceHistorySessionRows({
      workspaceNode: {
        ...workspaceNode,
        agents: [
          {
            ...workspaceNode.agents[0],
            runs: [
              {
                ...workspaceNode.agents[0].runs[0],
                runId: 'agent-titled',
                displayTitle: '  Explicit agent title  ',
                summary: 'Raw agent prompt summary',
              } as any,
            ],
          },
        ],
      },
      teamNodes: [
        buildTeam({
          teamRunId: 'team-titled',
          sessionTitle: '  Explicit team title  ',
          summary: 'Raw team prompt summary',
        }),
      ],
    });

    expect(rows.find((row) => row.sessionKey === 'agent:agent-titled')?.displayLabel)
      .toMatchObject({
        title: 'Explicit agent title',
        rawSummary: 'Raw agent prompt summary',
        titleSource: 'explicit',
      });
    expect(rows.find((row) => row.sessionKey === 'team:team-titled')?.displayLabel)
      .toMatchObject({
        title: 'Explicit team title',
        rawSummary: 'Raw team prompt summary',
        titleSource: 'explicit',
      });
  });

  it('keeps each team run from the same team definition as a separate session row', () => {
    const rows = buildWorkspaceHistorySessionRows({
      workspaceNode: { ...workspaceNode, agents: [] },
      teamNodes: [
        buildTeam({ teamRunId: 'team-1', summary: 'First team session' }),
        buildTeam({ teamRunId: 'team-2', summary: 'Second team session' }),
      ],
    });

    expect(rows.map((row) => row.sessionKey).sort()).toEqual(['team:team-1', 'team:team-2']);
    expect(rows.every((row) => row.kind === 'team')).toBe(true);
  });
});
