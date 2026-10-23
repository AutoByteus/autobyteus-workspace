import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { applyRunNavigationEffectToProjection } from '../runHistoryNavigationPatches';
import { buildRunHistoryNavigationProjection } from '../runHistoryNavigationProjection';

const projectionWithHistoryRun = (summary: string) => buildRunHistoryNavigationProjection({
  workspaceGroups: [{
    workspaceRootPath: '/workspace-a',
    workspaceName: 'Workspace A',
    teamDefinitions: [],
    agentDefinitions: [{
      agentDefinitionId: 'agent-a',
      agentName: 'Agent A',
      runs: [{
        runId: 'run-a',
        summary,
        createdAt: '2026-07-01T10:00:00.000Z',
        status: AgentStatus.Idle,
        isActive: true,
      }],
    }],
  }],
  agentAvatarByDefinitionId: {},
  allWorkspaces: [{ workspaceId: 'workspace-a', workspaceRootPath: '/workspace-a', name: 'Workspace A' }],
  workspacesById: {},
  agentContexts: new Map(),
  teamContexts: [],
  agentOrgHistory: [],
});

const submitLocally = (summary: string) => {
  const result = applyRunNavigationEffectToProjection(projectionWithHistoryRun(summary), {
    kind: 'standalone',
    runId: 'run-a',
    currentStatus: AgentStatus.Running,
    summary: 'You have a new task from Planner on node alpha. Task: Write the report',
  }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:05:00.000Z' });
  return result.state.workspaceNodes[0]?.agents[0]?.runs[0];
};

describe('a local submission on a history row with a stored title', () => {
  it('keeps the stored title and still applies status and activity', () => {
    expect(submitLocally('Write the report')).toMatchObject({
      summary: 'Write the report',
      currentStatus: AgentStatus.Running,
      lastActivityAt: '2026-07-01T10:05:00.000Z',
    });
  });

  it('fills a history row that has no stored title yet', () => {
    expect(submitLocally('')).toMatchObject({
      summary: 'You have a new task from Planner on node alpha. Task: Write the report',
    });
  });
});
