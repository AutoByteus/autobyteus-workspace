import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore, type ToolActivity } from '../agentActivityStore';

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
});
