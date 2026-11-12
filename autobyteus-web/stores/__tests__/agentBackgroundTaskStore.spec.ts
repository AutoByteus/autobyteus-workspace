import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentBackgroundTaskStore } from '../agentBackgroundTaskStore';
import type { BackgroundTask } from '~/types/backgroundTask';

const task = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  taskId: 'task-1',
  kind: 'shell',
  description: 'sleep 20',
  command: 'sleep 20',
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

  it('fills a command reported by a follow-up snapshot into the same row (REQ-007)', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ description: 'Wait for workflows', command: null }));
    store.upsertTask('run-1', task({ description: 'Wait for workflows', command: 'gh run watch 42' }));

    expect(store.getTasks('run-1')).toEqual([task({ description: 'Wait for workflows', command: 'gh run watch 42' })]);
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

  // autobyteus-473: the background-task view's answer seeds a run's tasks the store does not know yet.
  it('seeds unknown tasks, finishes a running one the answer shows ended, and never replaces an ended one', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ taskId: 'running-here' }));
    store.upsertTask('run-1', task({ taskId: 'ended-here', status: 'stopped', summary: 'stopped by the user' }));

    store.seedTasks('run-1', [
      task({ taskId: 'new', description: 'new one' }),
      task({ taskId: 'running-here', status: 'failed', summary: 'exit code 1' }),
      task({ taskId: 'ended-here', status: 'running' }),
    ]);

    const byId = Object.fromEntries(store.getTasks('run-1').map((item) => [item.taskId, [item.status, item.summary]]));
    expect(byId).toEqual({
      new: ['running', null],
      'running-here': ['failed', 'exit code 1'],
      'ended-here': ['stopped', 'stopped by the user'],
    });
  });

  it('keeps a running task as it is when the answer also shows it running', () => {
    const store = useAgentBackgroundTaskStore();
    store.upsertTask('run-1', task({ taskId: 'a', command: 'from the stream' }));
    store.seedTasks('run-1', [task({ taskId: 'a', command: null })]);
    expect(store.getTasks('run-1')[0]!.command).toBe('from the stream');
  });
});
