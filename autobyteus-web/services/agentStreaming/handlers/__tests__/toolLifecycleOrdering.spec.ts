import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import { handleSegmentEnd, handleSegmentStart } from '../segmentHandler';
import {
  handleToolApprovalRequested,
  handleToolExecutionSucceeded,
} from '../toolLifecycleHandler';

const runId = 'test-agent-id';

const buildContext = (): AgentContext =>
  ({
    state: { runId },
    conversation: {
      messages: [],
      updatedAt: '',
    },
  }) as AgentContext;

describe('tool lifecycle ordering regression', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('preserves awaiting-approval when SEGMENT_END arrives after approval was requested', () => {
    const context = buildContext();

    handleSegmentStart(
      {
        id: 'edit-1',
        segment_type: 'edit_file',
        metadata: {
          path: '/tmp/example.py',
        },
      },
      context,
    );

    handleToolApprovalRequested(
      {
        invocation_id: 'edit-1',
        tool_name: 'edit_file',
        arguments: {
          path: '/tmp/example.py',
          patch: '@@ -1 +1 @@\n-print("old")\n+print("new")\n',
        },
      },
      context,
    );

    handleSegmentEnd(
      {
        id: 'edit-1',
        metadata: {
          tool_name: 'edit_file',
          path: '/tmp/example.py',
          patch: '@@ -1 +1 @@\n-print("old")\n+print("new")\n',
        },
      },
      context,
    );

    const activity = useAgentActivityStore().getActivities(runId)[0];
    expect(activity?.status).toBe('awaiting-approval');
  });

  it('preserves success when SEGMENT_END arrives after tool execution succeeded', () => {
    const context = buildContext();

    handleSegmentStart(
      {
        id: 'edit-2',
        segment_type: 'edit_file',
        metadata: {
          path: '/tmp/example.py',
        },
      },
      context,
    );

    handleToolExecutionSucceeded(
      {
        invocation_id: 'edit-2',
        tool_name: 'edit_file',
        result: {
          ok: true,
        },
      },
      context,
    );

    handleSegmentEnd(
      {
        id: 'edit-2',
        metadata: {
          tool_name: 'edit_file',
          path: '/tmp/example.py',
          patch: '@@ -1 +1 @@\n-print("old")\n+print("new")\n',
        },
      },
      context,
    );

    const activity = useAgentActivityStore().getActivities(runId)[0];
    expect(activity?.status).toBe('success');
  });
});
