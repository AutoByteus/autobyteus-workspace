import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { handleBackgroundTaskUpdated } from '../backgroundTaskHandler';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { BackgroundTaskUpdatedPayload } from '../../protocol/messageTypes';

describe('backgroundTaskHandler', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('applies the snapshot to the run that received it', () => {
    const payload: BackgroundTaskUpdatedPayload = {
      task_id: 'bg-1',
      kind: 'subagent',
      description: 'Research lighthouses',
      command: null,
      status: 'completed',
      summary: 'Wrote the report.',
      started_at: '2026-09-29T16:48:20.000Z',
    };

    handleBackgroundTaskUpdated(payload, { state: { runId: 'run-1' } } as unknown as AgentContext);

    expect(useAgentBackgroundTaskStore().getTasks('run-1')).toEqual([{
      taskId: 'bg-1',
      kind: 'subagent',
      description: 'Research lighthouses',
      command: null,
      status: 'completed',
      summary: 'Wrote the report.',
      startedAt: '2026-09-29T16:48:20.000Z',
    }]);
  });

  it('carries the command of a shell task into the store (AC-006)', () => {
    handleBackgroundTaskUpdated({
      task_id: 'bg-2', kind: 'shell', description: 'Wait for release workflows to complete',
      command: 'gh run watch 42', status: 'running', summary: null, started_at: '2026-09-29T16:48:20.000Z',
    }, { state: { runId: 'run-1' } } as unknown as AgentContext);

    expect(useAgentBackgroundTaskStore().getTasks('run-1')[0]?.command).toBe('gh run watch 42');
  });
});
