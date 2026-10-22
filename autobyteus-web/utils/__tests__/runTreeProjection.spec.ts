import { describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunTreeProjection } from '~/utils/runTreeProjection';

describe('buildRunTreeProjection', () => {
  it('uses registered workspace descriptors as the only top-level row source', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const nodes = buildRunTreeProjection({
      workspaceDescriptors: [
        {
          workspaceId: 'workspace-a',
          workspaceRootPath: '/ws/a',
          workspaceName: 'Alpha',
          workspaceKind: 'filesystem',
          canRemoveFromWorkspaces: true,
        },
      ],
      persistedWorkspaces: [
        {
          workspaceRootPath: '/ws/a',
          workspaceName: 'Alpha from history',
          agents: [
            {
              agentDefinitionId: 'agent-a',
              agentName: 'Agent A',
              runs: [
                {
                  runId: 'run-a',
                  summary: 'registered run',
                  lastActivityAt: '2026-01-01T00:00:00.000Z',
                  currentStatus: AgentStatus.Offline,
                  lastKnownStatus: 'IDLE',
                  isActive: false,
                },
              ],
            },
          ],
        },
        {
          workspaceRootPath: '/ws/removed',
          workspaceName: 'Removed',
          agents: [
            {
              agentDefinitionId: 'agent-removed',
              agentName: 'Removed Agent',
              runs: [
                {
                  runId: 'run-removed',
                  summary: 'removed run',
                  lastActivityAt: '2026-01-02T00:00:00.000Z',
                  currentStatus: AgentStatus.Offline,
                  lastKnownStatus: 'IDLE',
                  isActive: false,
                },
              ],
            },
          ],
        },
      ],
      localRuns: [
        {
          runId: 'temp-removed',
          workspaceRootPath: '/ws/removed',
          agentDefinitionId: 'agent-draft',
          agentName: 'Draft Agent',
          summary: 'draft removed',
          lastActivityAt: '2026-01-03T00:00:00.000Z',
          currentStatus: AgentStatus.Idle,
          lastKnownStatus: 'ACTIVE',
          isActive: true,
          source: 'draft',
        },
      ],
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      workspaceId: 'workspace-a',
      workspaceRootPath: '/ws/a',
      workspaceName: 'Alpha',
    });
    expect(nodes[0]?.agents.flatMap((agent) => agent.runs.map((run) => run.runId))).toEqual([
      'run-a',
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ runId: 'temp-removed' }),
    );

    warnSpy.mockRestore();
  });

  it('dedupes local rows under descriptors and lets history replace local context rows', () => {
    const nodes = buildRunTreeProjection({
      workspaceDescriptors: [
        {
          workspaceId: 'workspace-a',
          workspaceRootPath: '/ws/a',
          workspaceName: 'Alpha',
          workspaceKind: 'filesystem',
          canRemoveFromWorkspaces: true,
        },
      ],
      persistedWorkspaces: [
        {
          workspaceRootPath: '/ws/a',
          workspaceName: 'Alpha from history',
          agents: [
            {
              agentDefinitionId: 'agent-a',
              agentName: 'Agent A',
              runs: [
                {
                  runId: 'run-permanent',
                  summary: 'history row',
                  lastActivityAt: '2026-01-02T00:00:00.000Z',
                  currentStatus: AgentStatus.Offline,
                  lastKnownStatus: 'IDLE',
                  isActive: false,
                },
              ],
            },
          ],
        },
      ],
      localRuns: [
        {
          runId: 'run-permanent',
          workspaceRootPath: '/ws/a',
          agentDefinitionId: 'agent-a',
          agentName: 'Agent A',
          summary: 'local row',
          lastActivityAt: '2026-01-03T00:00:00.000Z',
          currentStatus: AgentStatus.Running,
          lastKnownStatus: 'ACTIVE',
          isActive: true,
          source: 'local',
        },
        {
          runId: 'run-local-only',
          workspaceRootPath: '/ws/a',
          agentDefinitionId: 'agent-a',
          agentName: 'Agent A',
          summary: 'local only',
          lastActivityAt: '2026-01-04T00:00:00.000Z',
          currentStatus: AgentStatus.Running,
          lastKnownStatus: 'ACTIVE',
          isActive: true,
          source: 'local',
        },
      ],
    });

    const rows = nodes[0]?.agents[0]?.runs ?? [];
    expect(rows.map((row) => [row.runId, row.source, row.summary])).toEqual([
      ['run-local-only', 'local', 'local only'],
      ['run-permanent', 'history', 'history row'],
    ]);
  });

  it('shows a stored history title through the same cleaning as the live summary', () => {
    const run = (runId: string, summary: string) => ({
      runId,
      summary,
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      currentStatus: AgentStatus.Offline,
      lastKnownStatus: 'IDLE' as const,
      isActive: false,
    });
    const nodes = buildRunTreeProjection({
      workspaceDescriptors: [{
        workspaceId: 'workspace-a',
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        workspaceKind: 'filesystem',
        canRemoveFromWorkspaces: true,
      }],
      persistedWorkspaces: [{
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agents: [{
          agentDefinitionId: 'agent-a',
          agentName: 'Agent A',
          runs: [
            run('run-skill', 'Use the writer skill for this request. Draft a note'),
            run('run-plain', 'Write the report'),
            run('run-empty', ''),
          ],
        }],
      }],
      localRuns: [],
    });

    const summaries = Object.fromEntries(
      nodes[0]!.agents[0]!.runs.map((row) => [row.runId, row.summary]),
    );
    expect(summaries).toEqual({ 'run-skill': 'Draft a note', 'run-plain': 'Write the report', 'run-empty': '' });
  });
});

