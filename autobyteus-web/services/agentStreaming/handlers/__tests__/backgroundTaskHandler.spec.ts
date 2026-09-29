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
      status: 'completed',
      summary: 'Wrote the report.',
      started_at: '2026-09-29T16:48:20.000Z',
    };

    handleBackgroundTaskUpdated(payload, { state: { runId: 'run-1' } } as unknown as AgentContext);

    expect(useAgentBackgroundTaskStore().getTasks('run-1')).toEqual([{
      taskId: 'bg-1',
      kind: 'subagent',
      description: 'Research lighthouses',
      status: 'completed',
      summary: 'Wrote the report.',
      startedAt: '2026-09-29T16:48:20.000Z',
    }]);
  });
});
