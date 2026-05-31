import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { hydrateActivitiesFromProjection } from '../runProjectionActivityHydration';

describe('runProjectionActivityHydration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('replaces stale activities with projected history rows', () => {
    const store = useAgentActivityStore();
    const runId = 'run-1';

    store.addToolActivity(runId, {
      kind: 'tool',
      activityId: 'stale',
      invocationId: 'stale',
      toolName: 'old_tool',
      type: 'tool_call',
      status: 'parsing',
      contextText: 'old_tool',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });

    hydrateActivitiesFromProjection(runId, [
      {
        invocationId: 'history-1',
        toolName: 'run_bash',
        status: 'success',
        contextText: 'pwd',
        arguments: { command: 'pwd' },
        result: { stdout: '/tmp' },
        logs: ['done'],
        ts: 10,
      },
    ]);

    const activities = store.getToolActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'history-1',
        toolName: 'run_bash',
        type: 'terminal_command',
        status: 'success',
        contextText: 'pwd',
      }),
    );
    expect(activities[0]?.logs).toEqual(['done']);
  });

  it('drops malformed projected rows without invocation ids', () => {
    const store = useAgentActivityStore();
    const runId = 'run-2';

    hydrateActivitiesFromProjection(runId, [
      {
        invocationId: '',
        toolName: 'broken',
        status: 'parsed',
        contextText: 'broken',
      },
      {
        invocationId: 'history-2',
        toolName: 'edit_file',
        status: 'parsed',
        contextText: 'src/app.ts',
        arguments: { path: 'src/app.ts', patch: '...' },
        ts: 20,
      },
    ]);

    const activities = store.getToolActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'history-2',
        type: 'edit_file',
      }),
    );
  });

  it('hydrates durable compaction projection rows without fabricating tool data', () => {
    const store = useAgentActivityStore();
    const runId = 'run-3';

    hydrateActivitiesFromProjection(runId, [
      {
        kind: 'compaction',
        activityId: 'compaction:boundary:boundary-1',
        phase: 'completed',
        message: 'Provider context compaction boundary recorded',
        turnId: 'turn-1',
        provider: 'codex',
        boundaryKey: 'boundary-1',
        ts: 30,
      },
    ]);

    expect(store.getToolActivities(runId)).toHaveLength(0);
    expect(store.getCompactionActivities(runId)).toEqual([
      expect.objectContaining({
        kind: 'compaction',
        activityId: 'compaction:boundary:boundary-1',
        phase: 'completed',
        provider: 'codex',
      }),
    ]);
  });

});
