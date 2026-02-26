import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { mergeRunTreeWithLiveContexts } from '~/utils/runTreeLiveStatusMerge';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const baseTree = (): RunTreeWorkspaceNode[] => [
  {
    workspaceRootPath: '/ws/a',
    workspaceName: 'Alpha',
    agents: [
      {
        agentDefinitionId: 'agent-1',
        agentName: 'Agent One',
        runs: [
          {
            agentId: 'run-history-a',
            summary: 'A',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            source: 'history',
            isDraft: false,
          },
          {
            agentId: 'run-history-b',
            summary: 'B',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            source: 'history',
            isDraft: false,
          },
          {
            agentId: 'temp-1',
            summary: 'draft',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'ACTIVE',
            isActive: true,
            source: 'draft',
            isDraft: true,
          },
        ],
      },
    ],
  },
];

describe('runTreeLiveStatusMerge', () => {
  it('overlays only matching persisted history run ids', () => {
    const contexts = new Map<string, any>([
      [
        'run-history-b',
        {
          state: {
            currentStatus: AgentStatus.Bootstrapping,
            conversation: { updatedAt: '2026-01-05T00:00:00.000Z' },
          },
        },
      ],
    ]);

    const merged = mergeRunTreeWithLiveContexts(baseTree(), contexts as Map<string, any>);
    const runA = merged[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-history-a');
    const runB = merged[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-history-b');
    const draft = merged[0]?.agents[0]?.runs.find((run) => run.agentId === 'temp-1');

    expect(runA?.isActive).toBe(false);
    expect(runA?.lastKnownStatus).toBe('IDLE');
    expect(runB?.isActive).toBe(true);
    expect(runB?.lastKnownStatus).toBe('ACTIVE');
    expect(runB?.lastActivityAt).toBe('2026-01-05T00:00:00.000Z');
    expect(draft?.isActive).toBe(true);
    expect(draft?.lastKnownStatus).toBe('ACTIVE');
  });

  it('keeps idle live contexts active while preserving terminal status mapping', () => {
    const contexts = new Map<string, any>([
      [
        'run-history-a',
        {
          state: {
            currentStatus: AgentStatus.Error,
            conversation: { updatedAt: '2026-01-02T00:00:00.000Z' },
          },
        },
      ],
      [
        'run-history-b',
        {
          state: {
            currentStatus: AgentStatus.Idle,
            conversation: { updatedAt: '2026-01-03T00:00:00.000Z' },
          },
        },
      ],
    ]);

    const merged = mergeRunTreeWithLiveContexts(baseTree(), contexts as Map<string, any>);
    const runA = merged[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-history-a');
    const runB = merged[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-history-b');

    expect(runA?.isActive).toBe(false);
    expect(runA?.lastKnownStatus).toBe('ERROR');
    expect(runB?.isActive).toBe(true);
    expect(runB?.lastKnownStatus).toBe('ACTIVE');
  });
});
