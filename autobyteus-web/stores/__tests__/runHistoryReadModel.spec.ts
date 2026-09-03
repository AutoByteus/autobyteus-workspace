import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTreeNodes } from '~/stores/runHistoryReadModel';

const workspace = {
  workspaceId: 'workspace-alpha',
  workspaceRootPath: '/ws/a',
  absolutePath: '/ws/a',
  name: 'Alpha',
  kind: 'filesystem',
};

const buildTree = (params: {
  workspaceGroups?: any[];
  agentContexts?: Map<string, any>;
}) => buildRunHistoryTreeNodes({
  workspaceGroups: params.workspaceGroups ?? [],
  agentAvatarByDefinitionId: {},
  allWorkspaces: [workspace],
  workspacesById: {
    [workspace.workspaceId]: workspace,
  },
  agentContexts: params.agentContexts ?? new Map(),
});

describe('runHistoryReadModel standalone status projection', () => {
  it.each([
    [AgentStatus.Initializing, true, 'ACTIVE'],
    [AgentStatus.Running, true, 'ACTIVE'],
    [AgentStatus.Idle, true, 'ACTIVE'],
    [AgentStatus.Error, true, 'ERROR'],
    [AgentStatus.Offline, false, 'IDLE'],
  ] as const)(
    'projects a current %s local run with isActive=%s and lastKnownStatus=%s',
    (currentStatus, isActive, lastKnownStatus) => {
      const tree = buildTree({
        agentContexts: new Map([
          [
            'temp-current',
            {
              config: {
                agentDefinitionId: 'agent-one',
                agentDefinitionName: 'Agent One',
                workspaceId: workspace.workspaceId,
                workspaceMetadata: { workspaceRootPath: workspace.workspaceRootPath },
              },
              state: {
                currentStatus,
                conversation: {
                  messages: [],
                  createdAt: '2026-09-03T12:00:00.000Z',
                  updatedAt: '2026-09-03T12:00:00.000Z',
                },
              },
            },
          ],
        ]),
      });

      expect(tree[0]?.agents[0]?.runs[0]).toMatchObject({
        runId: 'temp-current',
        currentStatus,
        lastKnownStatus,
        isActive,
        source: 'draft',
      });
    },
  );

  it('preserves authoritative inactivity for persisted history with past error evidence', () => {
    const tree = buildTree({
      workspaceGroups: [
        {
          workspaceRootPath: workspace.workspaceRootPath,
          workspaceName: workspace.name,
          agentDefinitions: [
            {
              agentDefinitionId: 'agent-one',
              agentName: 'Agent One',
              runs: [
                {
                  runId: 'run-past-error',
                  summary: 'Past error',
                  createdAt: '2026-09-03T11:00:00.000Z',
                  status: AgentStatus.Error,
                  isActive: false,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(tree[0]?.agents[0]?.runs[0]).toMatchObject({
      runId: 'run-past-error',
      currentStatus: AgentStatus.Error,
      lastKnownStatus: 'ERROR',
      isActive: false,
      source: 'history',
    });
  });
});
