import { describe, expect, it } from 'vitest';
import { deriveTaskDelegationPresentation } from '../taskDelegationPresentation';
import { testTaskRecord } from '~/test-support/currentTeamTestFixtures';

const record = (overrides: Parameters<typeof testTaskRecord>[0]) => testTaskRecord(overrides);

describe('taskDelegationPresentation', () => {
  it.each([
    ['active', [], 'in_progress'],
    ['awaiting_review', [], 'awaiting_review'],
    ['accepted', [], 'accepted'],
    ['interrupted', [], 'interrupted'],
    ['active', [{ kind: 'review', decision: 'request_revision' }], 'revision_requested'],
  ] as const)('maps %s to %s without changing stored lifecycle', (status, updates, displayStatus) => {
    const task = record({
      taskId: 'task-1', delegatorAgentRunId: 'run-a', recipientAddress: '/member',
      target: { agentRunId: 'task-run' }, status, updates: updates as any,
      description: 'Deliver exact task visibility',
    });

    expect(deriveTaskDelegationPresentation(task)).toEqual({
      taskId: 'task-1', description: 'Deliver exact task visibility', displayStatus,
    });
    expect(task.status).toBe(status);
  });
});
