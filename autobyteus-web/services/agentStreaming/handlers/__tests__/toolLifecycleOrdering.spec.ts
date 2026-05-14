import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import { handleAssistantComplete, handleError, handleTurnCompleted } from '../agentStatusHandler';
import { handleSegmentEnd, handleSegmentStart } from '../segmentHandler';
import {
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolExecutionStarted,
  handleToolExecutionSucceeded,
  handleToolLog,
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

    let activities = useAgentActivityStore().getActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-segment-first',
        toolName: 'Bash',
        type: 'terminal_command',
        status: 'parsing',
        arguments: { command: 'pwd' },
      }),
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

    activities = useAgentActivityStore().getActivities(runId);
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

  it('treats a legacy approval-suffixed lifecycle id and its base segment id as distinct invocations', () => {
    const context = buildContext();
    const store = useAgentActivityStore();

    handleToolExecutionStarted(
      {
        invocation_id: 'bash-alias-base:approval-1',
        tool_name: 'run_bash',
        turn_id: 'turn-1',
        arguments: { command: 'pwd' },
      },
      context,
    );

    handleSegmentStart(
      {
        id: 'bash-alias-base',
        turn_id: 'turn-1',
        segment_type: 'run_bash',
        metadata: {
          command: 'pwd',
        },
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.segments).toHaveLength(2);
    expect(aiMessage.segments.map((segment: any) => segment.invocationId)).toEqual([
      'bash-alias-base:approval-1',
      'bash-alias-base',
    ]);
    expect(aiMessage.segments[0]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-alias-base:approval-1',
        type: 'terminal_command',
        command: 'pwd',
        status: 'executing',
      }),
    );
    expect(aiMessage.segments[1]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-alias-base',
        type: 'terminal_command',
        command: 'pwd',
        status: 'parsing',
      }),
    );

    const activities = store.getActivities(runId);
    expect(activities).toHaveLength(2);
    expect(activities.map((activity) => activity.invocationId)).toEqual([
      'bash-alias-base:approval-1',
      'bash-alias-base',
    ]);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-alias-base:approval-1',
        toolName: 'run_bash',
        type: 'terminal_command',
        status: 'executing',
        arguments: { command: 'pwd' },
      }),
    );
    expect(activities[1]).toEqual(
      expect.objectContaining({
        invocationId: 'bash-alias-base',
        type: 'terminal_command',
        status: 'parsing',
        arguments: { command: 'pwd' },
      }),
    );
  });

  it('does not correlate base ids with old tool, approval, or generated suffix shapes', () => {
    const context = buildContext();
    const store = useAgentActivityStore();
    const cases: Array<[string, string]> = [
      ['call_1', 'call_1:write_file'],
      ['call_2', 'call_2:edit_file'],
      ['call_3', 'call_3:approval-1'],
      ['run_bash', 'run_bash:1'],
      ['call_4', 'call_4:run_bash'],
      ['call_5', 'call_5:terminal_command'],
      ['call_6', 'call_6:tool_call'],
      ['call_7', 'call_7:generated-random'],
    ];

    for (const [index, [baseId, suffixedId]] of cases.entries()) {
      handleSegmentStart(
        {
          id: baseId,
          turn_id: 'turn-1',
          segment_type: 'run_bash',
          metadata: { command: `echo base-${index}` },
        },
        context,
      );
      handleToolExecutionStarted(
        {
          invocation_id: suffixedId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          arguments: { command: `echo suffix-${index}` },
        },
        context,
      );
    }

    const expectedIds = cases.flatMap(([baseId, suffixedId]) => [baseId, suffixedId]);
    const toolSegments = context.conversation.messages.flatMap((message) =>
      message.type === 'ai'
        ? (message.segments as any[]).filter((segment) => segment.type === 'terminal_command')
        : [],
    );
    expect(toolSegments).toHaveLength(expectedIds.length);
    expect(toolSegments.map((segment) => segment.invocationId)).toEqual(expectedIds);
    expect(store.getActivities(runId).map((activity) => activity.invocationId)).toEqual(expectedIds);
  });

  it('keeps Kimi numeric run_bash invocations distinct across transcript and Activity after intermediate assistant completion', () => {
    const context = buildContext();
    const store = useAgentActivityStore();
    const invocations = ['run_bash:0', 'run_bash:1', 'run_bash:2', 'run_bash:3', 'run_bash:4'];

    for (const [index, invocationId] of invocations.entries()) {
      const command = index === 0 ? 'pwd' : `echo phase-${index}`;

      handleSegmentStart(
        {
          id: invocationId,
          turn_id: 'turn-1',
          segment_type: 'run_bash',
          metadata: { command },
        },
        context,
      );
      handleToolExecutionStarted(
        {
          invocation_id: invocationId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          arguments: { command },
        },
        context,
      );
      handleToolLog(
        {
          tool_invocation_id: invocationId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          log_entry: `log for ${invocationId}`,
        },
        context,
      );
      handleToolExecutionSucceeded(
        {
          invocation_id: invocationId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          result: { stdout: `${invocationId} ok\n` },
        },
        context,
      );

      if (invocationId === 'run_bash:1') {
        handleAssistantComplete({}, context);
      }
    }

    handleTurnCompleted({ turn_id: 'turn-1' }, context);

    const toolSegments = context.conversation.messages.flatMap((message) =>
      message.type === 'ai'
        ? (message.segments as any[]).filter((segment) => segment.type === 'terminal_command')
        : [],
    );
    expect(toolSegments).toHaveLength(5);
    expect(toolSegments.map((segment) => segment.invocationId)).toEqual(invocations);
    expect(toolSegments.map((segment) => segment.command)).toEqual([
      'pwd',
      'echo phase-1',
      'echo phase-2',
      'echo phase-3',
      'echo phase-4',
    ]);

    const activities = store.getActivities(runId);
    expect(activities).toHaveLength(5);
    expect(activities.map((activity) => activity.invocationId)).toEqual(invocations);
    for (const invocationId of invocations) {
      expect(activities.find((activity) => activity.invocationId === invocationId)).toEqual(
        expect.objectContaining({
          status: 'success',
          logs: [`log for ${invocationId}`],
          result: { stdout: `${invocationId} ok\n` },
        }),
      );
    }
  });

  it('keeps Kimi tool visibility when an OpenAI-compatible provider continuation error arrives', () => {
    const context = buildContext();
    const store = useAgentActivityStore();
    const invocations = ['run_bash:0', 'run_bash:1', 'run_bash:2', 'run_bash:3', 'run_bash:4'];

    for (const [index, invocationId] of invocations.entries()) {
      const command = index === 0 ? 'pwd' : `echo phase-${index}`;

      handleSegmentStart(
        {
          id: invocationId,
          turn_id: 'turn-1',
          segment_type: 'run_bash',
          metadata: { command },
        },
        context,
      );
      handleToolExecutionStarted(
        {
          invocation_id: invocationId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          arguments: { command },
        },
        context,
      );
      handleToolExecutionSucceeded(
        {
          invocation_id: invocationId,
          tool_name: 'run_bash',
          turn_id: 'turn-1',
          result: { stdout: `${invocationId} ok\n` },
        },
        context,
      );
    }

    handleError(
      {
        code: 'OPENAI_COMPATIBLE_PROVIDER_ERROR',
        message: '400 Param Incorrect: Xiaomi/mimo-v2.5-pro continuation request rejected',
      },
      context,
    );

    const toolSegments = context.conversation.messages.flatMap((message) =>
      message.type === 'ai'
        ? (message.segments as any[]).filter((segment) => segment.type === 'terminal_command')
        : [],
    );
    expect(toolSegments).toHaveLength(5);
    expect(toolSegments.map((segment) => segment.invocationId)).toEqual(invocations);

    const activities = store.getActivities(runId);
    expect(activities).toHaveLength(5);
    expect(activities.map((activity) => activity.invocationId)).toEqual(invocations);
    expect(activities.every((activity) => activity.status === 'success')).toBe(true);

    const errorSegments = context.conversation.messages.flatMap((message) =>
      message.type === 'ai'
        ? (message.segments as any[]).filter((segment) => segment.type === 'error')
        : [],
    );
    expect(errorSegments).toEqual([
      {
        type: 'error',
        source: 'OPENAI_COMPATIBLE_PROVIDER_ERROR',
        message: '400 Param Incorrect: Xiaomi/mimo-v2.5-pro continuation request rejected',
      },
    ]);
  });

  it('seeds Codex dynamic tool and file-change Activity from segments and keeps lifecycle deduped', () => {
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

    expect(store.getActivities(runId).map((activity) => activity.invocationId).sort()).toEqual([
      'codex-command-1',
      'codex-dynamic-1',
      'codex-file-1',
    ]);
    expect(store.getActivities(runId).find((activity) => activity.invocationId === 'codex-dynamic-1')).toEqual(
      expect.objectContaining({
        status: 'parsing',
        toolName: 'echo_dynamic',
        type: 'tool_call',
        arguments: { value: 'HELLO_DYNAMIC' },
      }),
    );
    expect(store.getActivities(runId).find((activity) => activity.invocationId === 'codex-file-1')).toEqual(
      expect.objectContaining({
        status: 'parsing',
        toolName: 'edit_file',
        type: 'edit_file',
        arguments: {
          path: '/tmp/example.py',
          patch: '@@\\n+print(\"hi\")',
        },
      }),
    );

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

  it('creates one terminal search_web Activity while preserving the transcript segment', () => {
    const context = buildContext();
    const store = useAgentActivityStore();
    const invocationId = 'codex-websearch-1';
    const searchArguments = {
      query: 'OpenAI Codex CLI web search',
      action_type: 'search',
    };

    handleSegmentStart(
      {
        id: invocationId,
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'search_web',
        },
      },
      context,
    );

    expect(store.getActivities(runId)).toEqual([
      expect.objectContaining({
        invocationId,
        toolName: 'search_web',
        type: 'tool_call',
        status: 'parsing',
        arguments: {},
      }),
    ]);

    handleToolExecutionStarted(
      {
        invocation_id: invocationId,
        tool_name: 'search_web',
        turn_id: 'turn-1',
        arguments: {},
      },
      context,
    );

    handleToolExecutionSucceeded(
      {
        invocation_id: invocationId,
        tool_name: 'search_web',
        turn_id: 'turn-1',
        arguments: searchArguments,
        result: {
          status: 'completed',
          query: searchArguments.query,
        },
      },
      context,
    );

    handleSegmentEnd(
      {
        id: invocationId,
        turn_id: 'turn-1',
        metadata: {
          tool_name: 'search_web',
          arguments: searchArguments,
        },
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.segments).toHaveLength(1);
    expect(aiMessage.segments[0]).toEqual(
      expect.objectContaining({
        invocationId,
        type: 'tool_call',
        toolName: 'search_web',
        status: 'success',
        arguments: searchArguments,
      }),
    );

    const activities = store.getActivities(runId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual(
      expect.objectContaining({
        invocationId,
        toolName: 'search_web',
        type: 'tool_call',
        status: 'success',
        arguments: searchArguments,
        result: {
          status: 'completed',
          query: searchArguments.query,
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
