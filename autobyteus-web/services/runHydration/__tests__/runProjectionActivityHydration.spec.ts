import { describe, expect, it } from 'vitest';
import { buildActivitiesFromProjection } from '../runProjectionActivityHydration';

describe('runProjectionActivityHydration', () => {
  it('builds projected history rows without writing a store', () => {
    const activities = buildActivitiesFromProjection([
      {
        kind: 'tool',
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
    const activities = buildActivitiesFromProjection([
      {
        kind: 'tool',
        invocationId: '',
        toolName: 'broken',
        status: 'parsed',
        contextText: 'broken',
      },
      {
        kind: 'tool',
        invocationId: 'history-2',
        toolName: 'edit_file',
        status: 'parsed',
        contextText: 'src/app.ts',
        arguments: { path: 'src/app.ts', patch: '...' },
        ts: 20,
      },
    ]);

    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'history-2',
        type: 'edit_file',
      }),
    );
  });

  it('hydrates exact system content and omits only malformed system rows', () => {
    const activities = buildActivitiesFromProjection([
      { kind: 'system_instruction', activityId: 'bad', content: 'bad', ts: 0 },
      { kind: 'system_instruction', activityId: 'raw-system', content: '  exact\ntext  ', ts: 40 },
      {
        kind: 'tool', invocationId: 'tool-after-bad', toolName: 'read_file',
        status: 'success', contextText: 'README.md', ts: 41,
      },
    ]);

    expect(activities).toEqual([
      {
        kind: 'system_instruction', activityId: 'raw-system', content: '  exact\ntext  ',
        timestamp: new Date(40_000),
      },
      expect.objectContaining({ kind: 'tool', activityId: 'tool-after-bad' }),
    ]);
  });

  it('hydrates durable compaction projection rows without fabricating tool data', () => {
    const activities = buildActivitiesFromProjection([
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

    expect(activities.filter((activity) => activity.kind === 'tool')).toHaveLength(0);
    expect(activities.filter((activity) => activity.kind === 'compaction')).toEqual([
      expect.objectContaining({
        kind: 'compaction',
        activityId: 'compaction:boundary:boundary-1',
        phase: 'completed',
        provider: 'codex',
        centerTimelineTimestamp: new Date(30_000),
      }),
    ]);
  });

});
