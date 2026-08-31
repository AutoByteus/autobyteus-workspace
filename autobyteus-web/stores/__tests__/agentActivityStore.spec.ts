import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '../agentActivityStore';
import type { ToolActivity } from '~/types/activity/RunActivity';

const buildToolActivity = (overrides: Partial<ToolActivity> = {}): ToolActivity => ({
  kind: 'tool',
  activityId: '1',
  invocationId: '1',
  toolName: 'tool',
  type: 'tool_call',
  status: 'parsing',
  contextText: '',
  arguments: {},
  logs: [],
  result: null,
  error: null,
  timestamp: new Date(),
  ...overrides,
});

describe('agentActivityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds an activity and retrieves it', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity({ toolName: 'my_tool', contextText: 'foo' }));

    const activities = store.getToolActivities(agentId);
    expect(activities).toHaveLength(1);
    expect(activities[0].toolName).toBe('my_tool');
    expect(store.getActivities(agentId)[0]?.activityId).toBe('1');
  });

  it('updates status and awaiting flag', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity());

    store.updateToolActivityStatus(agentId, '1', 'awaiting-approval');
    expect(store.hasAwaitingApproval(agentId)).toBe(true);

    store.updateToolActivityStatus(agentId, '1', 'executing');
    expect(store.hasAwaitingApproval(agentId)).toBe(false);
  });

  it('does not regress stronger lifecycle states back to parsed', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity());

    store.updateToolActivityStatus(agentId, '1', 'awaiting-approval');
    store.updateToolActivityStatus(agentId, '1', 'parsed');

    expect(store.getToolActivities(agentId)[0]?.status).toBe('awaiting-approval');
    expect(store.hasAwaitingApproval(agentId)).toBe(true);
  });

  it('does not regress terminal states when late parsed reconciliation arrives', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity());

    store.updateToolActivityStatus(agentId, '1', 'success');
    store.updateToolActivityStatus(agentId, '1', 'parsed');

    expect(store.getToolActivities(agentId)[0]?.status).toBe('success');
  });

  it('appends logs', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity({ status: 'executing' }));

    store.addToolActivityLog(agentId, '1', 'log line 1');
    store.addToolActivityLog(agentId, '1', 'log line 2');

    const activity = store.getToolActivities(agentId)[0];
    expect(activity.logs).toHaveLength(2);
    expect(activity.logs[1]).toBe('log line 2');
  });

  it('updates placeholder tool name from lifecycle metadata', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity({ toolName: 'MISSING_TOOL_NAME' }));

    store.updateToolActivityToolName(agentId, '1', 'send_message_to');

    const activity = store.getToolActivities(agentId)[0];
    expect(activity.toolName).toBe('send_message_to');
  });

  it('updates unknown_tool placeholders from lifecycle metadata', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addToolActivity(agentId, buildToolActivity({ toolName: 'unknown_tool' }));

    store.updateToolActivityToolName(agentId, '1', 'send_message_to');

    const activity = store.getToolActivities(agentId)[0];
    expect(activity.toolName).toBe('send_message_to');
  });

  it('drops malformed activity entries without invocationId', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    store.addToolActivity(agentId, buildToolActivity({
      activityId: '' as unknown as string,
      invocationId: '' as unknown as string,
      toolName: 'broken',
    }));

    expect(store.getActivities(agentId)).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('upserts compaction activities without changing Activity placement timestamp or first center timeline timestamp', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';
    const firstTimestamp = new Date('2026-05-31T10:00:00.000Z');
    const firstCenterTimestamp = new Date('2026-05-31T10:00:30.000Z');

    store.upsertCompactionActivity(agentId, {
      kind: 'compaction',
      activityId: 'compaction:task:1',
      phase: 'started',
      message: 'Compacting memory…',
      timestamp: firstTimestamp,
      updatedAt: firstTimestamp,
      centerTimelineTimestamp: firstCenterTimestamp,
    });
    store.upsertCompactionActivity(agentId, {
      kind: 'compaction',
      activityId: 'compaction:task:1',
      phase: 'completed',
      message: 'Memory compacted',
      timestamp: new Date('2026-05-31T10:01:00.000Z'),
      updatedAt: new Date('2026-05-31T10:01:00.000Z'),
      centerTimelineTimestamp: new Date('2026-05-31T10:01:00.000Z'),
    });

    const activity = store.getCompactionActivities(agentId)[0];
    expect(activity.phase).toBe('completed');
    expect(activity.timestamp).toBe(firstTimestamp);
    expect(activity.centerTimelineTimestamp).toBe(firstCenterTimestamp);
    expect(store.getToolActivities(agentId)).toHaveLength(0);
  });

  it('deduplicates exact system activity and rejects conflicting raw ID reuse', () => {
    const store = useAgentActivityStore();
    const runId = 'system-run';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const activity = {
      kind: 'system_instruction' as const,
      activityId: 'raw-system-id',
      content: ' exact\ncontent ',
      timestamp: new Date(12_500),
    };

    expect(store.upsertSystemInstructionActivity(runId, activity)).toBe(true);
    expect(store.upsertSystemInstructionActivity(runId, { ...activity })).toBe(false);
    expect(store.upsertSystemInstructionActivity(runId, { ...activity, content: 'conflict' })).toBe(false);

    expect(store.getActivities(runId)).toEqual([activity]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('caps Activity at 100 by evicting completed records before older mutable records and repairs derived state', () => {
    const store = useAgentActivityStore();
    const agentId = 'bounded-agent';
    store.addToolActivity(agentId, buildToolActivity({
      activityId: 'mutable-oldest',
      invocationId: 'mutable-oldest',
      status: 'awaiting-approval',
    }));
    store.setHighlightedActivity(agentId, 'completed-0');
    for (let index = 0; index < 100; index += 1) {
      store.addToolActivity(agentId, buildToolActivity({
        activityId: `completed-${index}`,
        invocationId: `completed-${index}`,
        status: 'success',
      }));
    }

    const activities = store.getActivities(agentId);
    expect(activities).toHaveLength(100);
    expect(activities.some((activity) => activity.activityId === 'mutable-oldest')).toBe(true);
    expect(activities.some((activity) => activity.activityId === 'completed-0')).toBe(false);
    expect(store.hasAwaitingApproval(agentId)).toBe(true);
    expect(store.getHighlightedActivityId(agentId)).toBeNull();
  });

  it('advances the content revision for every successful content mutation but not UI-only or rejected operations', () => {
    const store = useAgentActivityStore();
    const runId = 'revision-run';

    expect(store.getActivityContentRevision(runId)).toBe(0);
    expect(store.addToolActivity(runId, buildToolActivity())).toBe(true);
    expect(store.getActivityContentRevision(runId)).toBe(1);
    expect(store.addToolActivity(runId, buildToolActivity())).toBe(false);
    expect(store.updateToolActivityStatus(runId, '1', 'awaiting-approval')).toBe(true);
    expect(store.addToolActivityLog(runId, '1', 'log')).toBe(true);
    expect(store.setToolActivityResult(runId, '1', { ok: true })).toBe(true);
    expect(store.updateToolActivityArguments(runId, '1', { path: 'a' })).toBe(true);
    expect(store.updateToolActivityApprovalTarget(runId, '1', { agentRunId: runId })).toBe(true);
    expect(store.getActivityContentRevision(runId)).toBe(6);

    store.setHighlightedActivity(runId, '1');
    expect(store.getActivityContentRevision(runId)).toBe(6);
    expect(store.updateToolActivityStatus(runId, '1', 'awaiting-approval')).toBe(false);
    expect(store.getActivityContentRevision(runId)).toBe(6);
  });

  it('treats clear as a monotonic invalidation boundary even for an empty run', () => {
    const store = useAgentActivityStore();
    const runId = 'clear-run';

    store.clearActivities(runId);
    expect(store.getActivityContentRevision(runId)).toBe(1);
    store.clearActivities(runId);
    expect(store.getActivityContentRevision(runId)).toBe(2);
  });

  it('replaces projection batches atomically and preserves only a surviving highlight', () => {
    const store = useAgentActivityStore();
    store.addToolActivity('run-a', buildToolActivity({ activityId: 'keep', invocationId: 'keep' }));
    store.addToolActivity('run-b', buildToolActivity({ activityId: 'old', invocationId: 'old' }));
    store.setHighlightedActivity('run-a', 'keep');
    const expectedA = store.getActivityContentRevision('run-a');
    const expectedB = store.getActivityContentRevision('run-b');

    expect(store.replaceProjectionActivitiesIfRevisions([
      { runId: 'run-a', expectedRevision: expectedA, activities: [buildToolActivity({ activityId: 'keep', invocationId: 'keep', status: 'awaiting-approval' })] },
      { runId: 'run-b', expectedRevision: expectedB - 1, activities: [] },
    ])).toBe('conflict');
    expect(store.getActivities('run-a').map((activity) => activity.activityId)).toEqual(['keep']);
    expect(store.getActivities('run-b').map((activity) => activity.activityId)).toEqual(['old']);

    expect(store.replaceProjectionActivitiesIfRevisions([
      { runId: 'run-a', expectedRevision: expectedA, activities: [buildToolActivity({ activityId: 'keep', invocationId: 'keep', status: 'awaiting-approval' })] },
      { runId: 'run-b', expectedRevision: expectedB, activities: [] },
    ])).toBe('applied');
    expect(store.getHighlightedActivityId('run-a')).toBe('keep');
    expect(store.hasAwaitingApproval('run-a')).toBe(true);
    expect(store.getActivities('run-b')).toEqual([]);
    expect(store.getActivityContentRevision('run-a')).toBe(expectedA + 1);
    expect(store.getActivityContentRevision('run-b')).toBe(expectedB + 1);
  });

  it('rejects a stale projection after an Activity clear-and-recreate ABA sequence', () => {
    const store = useAgentActivityStore();
    const expectedRevision = store.getActivityContentRevision('run-aba');
    store.clearActivities('run-aba');
    store.addToolActivity('run-aba', buildToolActivity({ activityId: 'live', invocationId: 'live' }));

    expect(store.replaceProjectionActivitiesIfRevisions([{
      runId: 'run-aba',
      expectedRevision,
      activities: [],
    }])).toBe('conflict');
    expect(store.getActivities('run-aba').map((activity) => activity.activityId)).toEqual(['live']);
  });

  it('keeps activity identity unique when a projection repeats an activity ID', () => {
    const store = useAgentActivityStore();
    expect(store.replaceProjectionActivitiesIfRevisions([{
      runId: 'run-duplicate',
      expectedRevision: 0,
      activities: [
        buildToolActivity({ activityId: 'same', invocationId: 'first' }),
        buildToolActivity({ activityId: 'same', invocationId: 'second' }),
      ],
    }])).toBe('applied');
    expect(store.getActivities('run-duplicate')).toEqual([
      expect.objectContaining({ activityId: 'same', invocationId: 'first' }),
    ]);
  });
});
