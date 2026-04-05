import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolDenied,
  handleToolExecutionFailed,
  handleToolExecutionStarted,
  handleToolExecutionSucceeded,
  handleToolLog,
} from '../toolLifecycleHandler';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type {
  EditFileSegment,
  TerminalCommandSegment,
  ToolCallSegment,
  WriteFileSegment,
} from '~/types/segments';
import type {
  ToolApprovalRequestedPayload,
  ToolApprovedPayload,
  ToolDeniedPayload,
  ToolExecutionFailedPayload,
  ToolExecutionStartedPayload,
  ToolExecutionSucceededPayload,
  ToolLogPayload,
} from '../../protocol/messageTypes';

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: vi.fn(),
}));

const runId = 'test-agent-id';

const buildEditFileSegment = (invocationId: string): EditFileSegment => ({
  type: 'edit_file',
  invocationId,
  toolName: 'edit_file',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  path: '',
  originalContent: '',
  language: 'diff',
});

const buildTerminalSegment = (invocationId: string): TerminalCommandSegment => ({
  type: 'terminal_command',
  invocationId,
  toolName: 'run_bash',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  command: '',
  description: '',
});

const buildWriteFileSegment = (invocationId: string): WriteFileSegment => ({
  type: 'write_file',
  invocationId,
  toolName: 'write_file',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  path: '',
  originalContent: '',
  language: 'text',
});

const buildToolCallSegment = (invocationId: string): ToolCallSegment => ({
  type: 'tool_call',
  invocationId,
  toolName: 'read_file',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  rawContent: '',
});

const buildContextWithSegment = (
  segment: ToolCallSegment | TerminalCommandSegment | EditFileSegment | WriteFileSegment,
): AgentContext =>
  ({
    state: { runId },
    conversation: {
      messages: [
        {
          type: 'ai',
          text: '',
          timestamp: new Date(),
          isComplete: false,
          segments: [
            Object.assign(segment, {
              _streamSegmentIdentity: {
                id: segment.invocationId,
                lookupKey: null,
              },
            }),
          ],
        },
      ],
      updatedAt: '',
    },
  }) as AgentContext;

const buildEmptyContext = (): AgentContext =>
  ({
    state: { runId },
    conversation: {
      messages: [
        {
          type: 'ai',
          text: '',
          timestamp: new Date(),
          isComplete: false,
          segments: [],
        },
      ],
      updatedAt: '',
    },
  }) as AgentContext;

describe('toolLifecycleHandler', () => {
  let mockActivityStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    const activities: any[] = [];
    mockActivityStore = {
      getActivities: vi.fn(() => activities),
      addActivity: vi.fn((_runId: string, activity: any) => {
        activities.push(activity);
      }),
      updateActivityStatus: vi.fn(),
      updateActivityArguments: vi.fn(),
      updateActivityToolName: vi.fn(),
      setHighlightedActivity: vi.fn(),
      addActivityLog: vi.fn(),
      setActivityResult: vi.fn(),
    };
    (useAgentActivityStore as any).mockReturnValue(mockActivityStore);
  });

  it('creates synthetic terminal segment and activity when TOOL_EXECUTION_STARTED arrives first', () => {
    const invocationId = 'missing-start-1';
    const context = buildEmptyContext();

    handleToolExecutionStarted(
      {
        invocation_id: invocationId,
        tool_name: 'run_bash',
        turn_id: 'turn-1',
        arguments: { command: 'ls -la' },
      },
      context,
    );

    const aiMessage = context.conversation.messages[0] as any;
    expect(aiMessage.segments).toHaveLength(1);
    expect(aiMessage.segments[0].type).toBe('terminal_command');
    expect(aiMessage.segments[0].invocationId).toBe(invocationId);
    expect(aiMessage.segments[0].command).toBe('ls -la');
    expect(aiMessage.segments[0].status).toBe('executing');

    expect(mockActivityStore.addActivity).toHaveBeenCalled();
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'executing');
  });

  it('hydrates edit_file on TOOL_APPROVAL_REQUESTED', () => {
    const invocationId = 'patch-1';
    const segment = buildEditFileSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolApprovalRequestedPayload = {
      invocation_id: invocationId,
      tool_name: 'edit_file',
      turn_id: 'turn-1',
      arguments: {
        path: '/tmp/example.txt',
        patch: '--- a\n+++ b\n@@\n+line\n',
      },
    };

    handleToolApprovalRequested(payload, context);

    expect(segment.status).toBe('awaiting-approval');
    expect(segment.path).toBe('/tmp/example.txt');
    expect(segment.originalContent).toBe('--- a\n+++ b\n@@\n+line\n');
    expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(runId, invocationId, 'edit_file');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'awaiting-approval');
    expect(mockActivityStore.updateActivityArguments).toHaveBeenCalledWith(runId, invocationId, payload.arguments);
  });

  it('applies TOOL_APPROVED then TOOL_EXECUTION_STARTED progression', () => {
    const invocationId = 'bash-1';
    const segment = buildTerminalSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const approvedPayload: ToolApprovedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      turn_id: 'turn-1',
      reason: 'approved',
    };
    const startedPayload: ToolExecutionStartedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      turn_id: 'turn-1',
      arguments: { command: 'npm run dev', background: true },
    };

    handleToolApproved(approvedPayload, context);
    expect(segment.status).toBe('approved');

    handleToolExecutionStarted(startedPayload, context);
    expect(segment.status).toBe('executing');
    expect(segment.command).toBe('npm run dev');
    expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(runId, invocationId, 'run_bash');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'approved');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'executing');
  });

  it('replaces unknown_tool placeholders when later lifecycle events carry the concrete tool name', () => {
    const invocationId = 'tool-send-message';
    const segment = buildToolCallSegment(invocationId);
    segment.toolName = 'unknown_tool';
    const context = buildContextWithSegment(segment);

    handleToolExecutionStarted(
      {
        invocation_id: invocationId,
        tool_name: 'send_message_to',
        turn_id: 'turn-1',
        arguments: {
          recipient_name: 'Student',
          content: 'Hard question',
        },
      },
      context,
    );

    expect(segment.toolName).toBe('send_message_to');
    expect(segment.status).toBe('executing');
    expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(
      runId,
      invocationId,
      'send_message_to',
    );
  });

  it('does not regress from executing back to approved', () => {
    const invocationId = 'bash-2';
    const segment = buildTerminalSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const startedPayload: ToolExecutionStartedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      turn_id: 'turn-1',
      arguments: { command: 'python server.py' },
    };
    const approvedPayload: ToolApprovedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      turn_id: 'turn-1',
      reason: 'late',
    };

    handleToolExecutionStarted(startedPayload, context);
    handleToolApproved(approvedPayload, context);

    expect(segment.status).toBe('executing');
  });

  it('applies success terminal state and ignores later started transition', () => {
    const invocationId = 'tool-1';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const startedPayload: ToolExecutionStartedPayload = {
      invocation_id: invocationId,
      tool_name: 'read_file',
      turn_id: 'turn-1',
      arguments: { path: '/tmp/a.txt' },
    };
    const succeededPayload: ToolExecutionSucceededPayload = {
      invocation_id: invocationId,
      tool_name: 'read_file',
      turn_id: 'turn-1',
      result: { content: 'ok' },
    };

    handleToolExecutionStarted(startedPayload, context);
    handleToolExecutionSucceeded(succeededPayload, context);
    handleToolExecutionStarted(startedPayload, context);

    expect(segment.status).toBe('success');
    expect(segment.result).toEqual({ content: 'ok' });
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'success');
  });

  it('applies failed terminal state and updates activity result', () => {
    const invocationId = 'tool-2';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolExecutionFailedPayload = {
      invocation_id: invocationId,
      tool_name: 'read_file',
      turn_id: 'turn-1',
      error: 'file not found',
    };

    handleToolExecutionFailed(payload, context);
    expect(segment.status).toBe('error');
    expect(segment.error).toBe('file not found');
    expect(mockActivityStore.setActivityResult).toHaveBeenCalledWith(runId, invocationId, null, 'file not found');
  });

  it('marks write_file touched entries available on TOOL_EXECUTION_SUCCEEDED', () => {
    const invocationId = 'write-1';
    const segment = buildWriteFileSegment(invocationId);
    segment.path = '/tmp/output.txt';
    const context = buildContextWithSegment(segment);
    const artifactsStore = useAgentArtifactsStore();

    artifactsStore.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId,
      path: segment.path,
      sourceTool: 'write_file',
    });
    artifactsStore.markTouchedEntryPending(runId, invocationId);

    handleToolExecutionSucceeded(
      {
        invocation_id: invocationId,
        tool_name: 'write_file',
        turn_id: 'turn-1',
        result: { ok: true },
      },
      context,
    );

    const artifact = artifactsStore.getArtifactsForRun(runId)[0];
    expect(artifact.status).toBe('available');
    expect(artifact.sourceTool).toBe('write_file');
  });

  it('marks edit_file touched entries failed on TOOL_DENIED', () => {
    const invocationId = 'edit-1';
    const segment = buildEditFileSegment(invocationId);
    segment.path = '/tmp/example.txt';
    const context = buildContextWithSegment(segment);
    const artifactsStore = useAgentArtifactsStore();

    artifactsStore.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId,
      path: segment.path,
      sourceTool: 'edit_file',
    });

    handleToolDenied(
      {
        invocation_id: invocationId,
        tool_name: 'edit_file',
        turn_id: 'turn-1',
        reason: 'Denied by user',
      },
      context,
    );

    const artifact = artifactsStore.getArtifactsForRun(runId)[0];
    expect(artifact.status).toBe('failed');
    expect(artifact.sourceTool).toBe('edit_file');
  });

  it('creates a lifecycle fallback touched entry when edit_file denial arrives before store registration', () => {
    const invocationId = 'edit-missed';
    const segment = buildEditFileSegment(invocationId);
    segment.path = '/tmp/missed.txt';
    const context = buildContextWithSegment(segment);
    const artifactsStore = useAgentArtifactsStore();

    handleToolDenied(
      {
        invocation_id: invocationId,
        tool_name: 'edit_file',
        turn_id: 'turn-1',
        reason: 'Denied by user',
      },
      context,
    );

    const artifact = artifactsStore.getArtifactsForRun(runId)[0];
    expect(artifact.path).toBe('/tmp/missed.txt');
    expect(artifact.status).toBe('failed');
    expect(artifact.sourceTool).toBe('edit_file');
  });

  it('applies denied terminal state when reason or error exists', () => {
    const invocationId = 'tool-3';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolDeniedPayload = {
      invocation_id: invocationId,
      tool_name: 'delete_file',
      turn_id: 'turn-1',
      reason: 'Denied by user',
    };

    handleToolDenied(payload, context);
    expect(segment.status).toBe('denied');
    expect(segment.error).toBe('Denied by user');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(runId, invocationId, 'denied');
  });

  it('drops malformed denied payload without state mutation', () => {
    const invocationId = 'tool-4';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    handleToolDenied(
      {
        invocation_id: invocationId,
        tool_name: 'delete_file',
        reason: null,
        error: null,
      } as any,
      context,
    );

    expect(segment.status).toBe('parsed');
    expect(mockActivityStore.updateActivityStatus).not.toHaveBeenCalled();
  });

  it('appends TOOL_LOG entries without inferring terminal status', () => {
    const invocationId = 'tool-5';
    const segment = buildToolCallSegment(invocationId);
    segment.status = 'executing';
    const context = buildContextWithSegment(segment);

    const payload: ToolLogPayload = {
      tool_invocation_id: invocationId,
      tool_name: 'read_file',
      turn_id: 'turn-1',
      log_entry: '[TOOL_RESULT_DIRECT] {"ok":true}',
    };

    handleToolLog(payload, context);

    expect(segment.logs).toContain(payload.log_entry);
    expect(segment.status).toBe('executing');
    expect(mockActivityStore.addActivityLog).toHaveBeenCalledWith(runId, invocationId, payload.log_entry);
    expect(mockActivityStore.updateActivityStatus).not.toHaveBeenCalled();
  });
});
