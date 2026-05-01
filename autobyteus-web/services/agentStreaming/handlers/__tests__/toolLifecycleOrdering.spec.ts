import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import { handleSegmentEnd, handleSegmentStart } from '../segmentHandler';
import {
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolExecutionStarted,
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

  it('keeps one Activity when SEGMENT_START arrives before TOOL_EXECUTION_STARTED', () => {
    const context = buildContext();

    handleSegmentStart(
      {
        id: 'bash-segment-first',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'Bash',
          arguments: { command: 'pwd' },
        },
      },
      context,
    );

    handleToolExecutionStarted(
      {
        invocation_id: 'bash-segment-first',
        tool_name: 'Bash',
        turn_id: 'turn-1',
        arguments: { command: 'pwd' },
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.segments).toHaveLength(1);
    expect(aiMessage.segments[0].arguments).toEqual({ command: 'pwd' });

    const activities = useAgentActivityStore().getActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-segment-first',
        toolName: 'Bash',
        type: 'terminal_command',
        status: 'executing',
        arguments: { command: 'pwd' },
      }),
    );
  });

  it('keeps one Activity and one conversation segment when lifecycle arrives before SEGMENT_START', () => {
    const context = buildContext();

    handleToolExecutionStarted(
      {
        invocation_id: 'bash-lifecycle-first',
        tool_name: 'Bash',
        turn_id: 'turn-1',
        arguments: { command: 'pwd' },
      },
      context,
    );

    handleSegmentStart(
      {
        id: 'bash-lifecycle-first',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'Bash',
          arguments: { command: 'pwd' },
        },
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.segments).toHaveLength(1);
    expect(aiMessage.segments[0].type).toBe('terminal_command');
    expect(aiMessage.segments[0].command).toBe('pwd');

    const activities = useAgentActivityStore().getActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-lifecycle-first',
        toolName: 'Bash',
        status: 'executing',
        arguments: { command: 'pwd' },
      }),
    );
  });

  it('keeps Codex command, dynamic tool, and file-change Activity lifecycle-owned', () => {
    const context = buildContext();
    const store = useAgentActivityStore();

    handleToolExecutionStarted(
      {
        invocation_id: 'codex-command-1',
        tool_name: 'run_bash',
        turn_id: 'turn-1',
        arguments: { command: 'echo command' },
      },
      context,
    );

    handleSegmentStart(
      {
        id: 'codex-dynamic-1',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'echo_dynamic',
          arguments: { value: 'HELLO_DYNAMIC' },
        },
      },
      context,
    );
    handleSegmentStart(
      {
        id: 'codex-file-1',
        turn_id: 'turn-1',
        segment_type: 'edit_file',
        metadata: {
          tool_name: 'edit_file',
          path: '/tmp/example.py',
          patch: '@@\\n+print(\"hi\")',
        },
      },
      context,
    );

    expect(store.getActivities(runId).map((activity) => activity.invocationId)).toEqual([
      'codex-command-1',
    ]);

    handleToolExecutionStarted(
      {
        invocation_id: 'codex-dynamic-1',
        tool_name: 'echo_dynamic',
        turn_id: 'turn-1',
        arguments: { value: 'HELLO_DYNAMIC' },
      },
      context,
    );
    handleToolExecutionStarted(
      {
        invocation_id: 'codex-file-1',
        tool_name: 'edit_file',
        turn_id: 'turn-1',
        arguments: {
          path: '/tmp/example.py',
          patch: '@@\\n+print(\"hi\")',
        },
      },
      context,
    );

    handleToolExecutionSucceeded(
      {
        invocation_id: 'codex-command-1',
        tool_name: 'run_bash',
        turn_id: 'turn-1',
        result: { stdout: 'command\\n' },
      },
      context,
    );
    handleToolExecutionSucceeded(
      {
        invocation_id: 'codex-dynamic-1',
        tool_name: 'echo_dynamic',
        turn_id: 'turn-1',
        result: 'HELLO_DYNAMIC',
      },
      context,
    );
    handleToolExecutionSucceeded(
      {
        invocation_id: 'codex-file-1',
        tool_name: 'edit_file',
        turn_id: 'turn-1',
        result: { ok: true },
      },
      context,
    );

    handleSegmentEnd({ id: 'codex-dynamic-1', turn_id: 'turn-1' }, context);
    handleSegmentEnd({ id: 'codex-file-1', turn_id: 'turn-1' }, context);

    const activities = store.getActivities(runId);
    expect(activities).toHaveLength(3);
    expect(activities.map((activity) => activity.invocationId).sort()).toEqual([
      'codex-command-1',
      'codex-dynamic-1',
      'codex-file-1',
    ]);
    expect(activities.every((activity) => activity.status === 'success')).toBe(true);
    expect(activities.find((activity) => activity.invocationId === 'codex-command-1')).toEqual(
      expect.objectContaining({
        type: 'terminal_command',
        arguments: { command: 'echo command' },
      }),
    );
    expect(activities.find((activity) => activity.invocationId === 'codex-dynamic-1')).toEqual(
      expect.objectContaining({
        type: 'tool_call',
        toolName: 'echo_dynamic',
        arguments: { value: 'HELLO_DYNAMIC' },
      }),
    );
    expect(activities.find((activity) => activity.invocationId === 'codex-file-1')).toEqual(
      expect.objectContaining({
        type: 'edit_file',
        arguments: {
          path: '/tmp/example.py',
          patch: '@@\\n+print(\"hi\")',
        },
      }),
    );
  });

  it('preserves awaiting-approval when SEGMENT_END arrives after approval was requested', () => {
    const context = buildContext();

    handleSegmentStart(
      {
        id: 'edit-1',
        turn_id: 'turn-1',
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
        turn_id: 'turn-1',
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
        turn_id: 'turn-1',
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

  it('shows approval controls when Claude approval request arrives after execution started', () => {
    const context = buildContext();
    const store = useAgentActivityStore();
    const invocationId = 'claude-write-approved-after-start';
    const writeArguments = {
      file_path: '/tmp/claude-notes.md',
      content: 'hello from claude',
    };

    handleToolExecutionStarted(
      {
        invocation_id: invocationId,
        tool_name: 'Write',
        turn_id: 'turn-1',
        arguments: writeArguments,
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    const segment = aiMessage.segments[0];
    expect(segment.status).toBe('executing');
    expect(store.getActivities(runId)[0]).toEqual(
      expect.objectContaining({
        invocationId,
        toolName: 'Write',
        status: 'executing',
        arguments: writeArguments,
      }),
    );
    expect(store.hasAwaitingApproval(runId)).toBe(false);

    handleToolApprovalRequested(
      {
        invocation_id: invocationId,
        tool_name: 'Write',
        turn_id: 'turn-1',
        arguments: writeArguments,
      },
      context,
    );

    expect(segment.status).toBe('awaiting-approval');
    expect(store.getActivities(runId)[0]).toEqual(
      expect.objectContaining({
        invocationId,
        status: 'awaiting-approval',
        arguments: writeArguments,
      }),
    );
    expect(store.hasAwaitingApproval(runId)).toBe(true);

    handleToolApproved(
      {
        invocation_id: invocationId,
        tool_name: 'Write',
        turn_id: 'turn-1',
        reason: 'approved by test',
      },
      context,
    );

    expect(segment.status).toBe('approved');
    expect(store.getActivities(runId)[0]).toEqual(
      expect.objectContaining({
        invocationId,
        status: 'approved',
        arguments: writeArguments,
      }),
    );
    expect(store.hasAwaitingApproval(runId)).toBe(false);

    handleToolExecutionSucceeded(
      {
        invocation_id: invocationId,
        tool_name: 'Write',
        turn_id: 'turn-1',
        arguments: writeArguments,
        result: { ok: true },
      },
      context,
    );

    expect(segment.status).toBe('success');
    expect(store.getActivities(runId)[0]).toEqual(
      expect.objectContaining({
        invocationId,
        status: 'success',
        arguments: writeArguments,
        result: { ok: true },
      }),
    );
    expect(store.hasAwaitingApproval(runId)).toBe(false);
  });

  it('preserves success when SEGMENT_END arrives after tool execution succeeded', () => {
    const context = buildContext();

    handleSegmentStart(
      {
        id: 'edit-2',
        turn_id: 'turn-1',
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
        turn_id: 'turn-1',
        result: {
          ok: true,
        },
      },
      context,
    );

    handleSegmentEnd(
      {
        id: 'edit-2',
        turn_id: 'turn-1',
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
