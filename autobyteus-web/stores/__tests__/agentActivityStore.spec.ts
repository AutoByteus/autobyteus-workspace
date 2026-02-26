import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '../agentActivityStore';

describe('agentActivityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds an activity and retrieves it', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addActivity(agentId, {
      invocationId: '1',
      toolName: 'my_tool',
      type: 'tool_call',
      status: 'parsing',
      contextText: 'foo',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });

    const activities = store.getActivities(agentId);
    expect(activities).toHaveLength(1);
    expect(activities[0].toolName).toBe('my_tool');
  });

  it('updates status and awaiting flag', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addActivity(agentId, {
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
    });

    store.updateActivityStatus(agentId, '1', 'awaiting-approval');
    expect(store.hasAwaitingApproval(agentId)).toBe(true);

    store.updateActivityStatus(agentId, '1', 'executing');
    expect(store.hasAwaitingApproval(agentId)).toBe(false);
  });

  it('appends logs', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addActivity(agentId, {
      invocationId: '1',
      toolName: 'tool',
      type: 'tool_call',
      status: 'executing',
      contextText: '',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });

    store.addActivityLog(agentId, '1', 'log line 1');
    store.addActivityLog(agentId, '1', 'log line 2');

    const activity = store.getActivities(agentId)[0];
    expect(activity.logs).toHaveLength(2);
    expect(activity.logs[1]).toBe('log line 2');
  });

  it('updates placeholder tool name from lifecycle metadata', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    store.addActivity(agentId, {
      invocationId: '1',
      toolName: 'MISSING_TOOL_NAME',
      type: 'tool_call',
      status: 'parsing',
      contextText: '',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });

    store.updateActivityToolName(agentId, '1', 'send_message_to');

    const activity = store.getActivities(agentId)[0];
    expect(activity.toolName).toBe('send_message_to');
  });

  it('drops malformed activity entries without invocationId', () => {
    const store = useAgentActivityStore();
    const agentId = 'test-agent';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    store.addActivity(agentId, {
      invocationId: '' as unknown as string,
      toolName: 'broken',
      type: 'tool_call',
      status: 'parsing',
      contextText: '',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date(),
    });

    expect(store.getActivities(agentId)).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });
});
