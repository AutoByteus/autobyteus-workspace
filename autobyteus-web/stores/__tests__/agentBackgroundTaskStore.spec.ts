import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentBackgroundTaskStore } from '../agentBackgroundTaskStore';
import type { BackgroundTask } from '~/types/backgroundTask';

const task = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  taskId: 'task-1',
  kind: 'shell',
  description: 'sleep 20',
  status: 'running',
  summary: null,
  startedAt: '2026-09-29T16:48:20.000Z',
  ...overrides,
});

describe('agentBackgroundTaskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts empty for every run', () => {
    const store = useAgentBackgroundTaskStore();
    expect(store.getTasks('run-1')).toEqual([]);
    expect(store.getCounts('run-1')).toEqual({ running: 0, total: 0 });
  });

  it('upserts by task id so a later snapshot replaces the earlier one', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task());
    store.upsertTask('run-1', task({ status: 'completed', summary: 'done' }));

    expect(store.getTasks('run-1')).toEqual([task({ status: 'completed', summary: 'done' })]);
    expect(store.getCounts('run-1')).toEqual({ running: 0, total: 1 });
  });

  it('lists newest first and changes only the finished task (AC-012)', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ taskId: 'older', startedAt: '2026-09-29T16:00:00.000Z' }));
    store.upsertTask('run-1', task({ taskId: 'newer', startedAt: '2026-09-29T17:00:00.000Z' }));
    expect(store.getCounts('run-1')).toEqual({ running: 2, total: 2 });

    store.upsertTask('run-1', task({ taskId: 'older', startedAt: '2026-09-29T16:00:00.000Z', status: 'failed' }));

    expect(store.getTasks('run-1').map((item) => [item.taskId, item.status])).toEqual([
      ['newer', 'running'],
      ['older', 'failed'],
    ]);
    expect(store.getCounts('run-1')).toEqual({ running: 1, total: 2 });
  });

  it('keeps each run separate (AC-009)', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('member-a', task());

    expect(store.getTasks('member-b')).toEqual([]);
  });
});
