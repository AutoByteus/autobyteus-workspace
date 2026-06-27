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
      draftRuns: [
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
});
