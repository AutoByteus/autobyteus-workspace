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
import type { AgentContext } from '~/types/agent/AgentContext';
import type {
  EditFileSegment,
  TerminalCommandSegment,
  ToolCallSegment,
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

const agentId = 'test-agent-id';

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

const buildContextWithSegment = (segment: ToolCallSegment | TerminalCommandSegment | EditFileSegment): AgentContext =>
  ({
    state: { agentId },
    conversation: {
      messages: [
        {
          type: 'ai',
          text: '',
          timestamp: new Date(),
          isComplete: false,
          segments: [Object.assign(segment, { _segmentId: segment.invocationId })],
        },
      ],
      updatedAt: '',
    },
  }) as AgentContext;

describe('toolLifecycleHandler', () => {
  let mockActivityStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockActivityStore = {
      updateActivityStatus: vi.fn(),
      updateActivityArguments: vi.fn(),
      updateActivityToolName: vi.fn(),
      setHighlightedActivity: vi.fn(),
      addActivityLog: vi.fn(),
      setActivityResult: vi.fn(),
    };
    (useAgentActivityStore as any).mockReturnValue(mockActivityStore);
  });

  it('hydrates edit_file on TOOL_APPROVAL_REQUESTED', () => {
    const invocationId = 'patch-1';
    const segment = buildEditFileSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolApprovalRequestedPayload = {
      invocation_id: invocationId,
      tool_name: 'edit_file',
      arguments: {
        path: '/tmp/example.txt',
        patch: '--- a\n+++ b\n@@\n+line\n',
      },
    };

    handleToolApprovalRequested(payload, context);

    expect(segment.status).toBe('awaiting-approval');
    expect(segment.path).toBe('/tmp/example.txt');
    expect(segment.originalContent).toBe('--- a\n+++ b\n@@\n+line\n');
    expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(agentId, invocationId, 'edit_file');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(agentId, invocationId, 'awaiting-approval');
    expect(mockActivityStore.updateActivityArguments).toHaveBeenCalledWith(agentId, invocationId, payload.arguments);
  });

  it('applies TOOL_APPROVED then TOOL_EXECUTION_STARTED progression', () => {
    const invocationId = 'bash-1';
    const segment = buildTerminalSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const approvedPayload: ToolApprovedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      reason: 'approved',
    };
    const startedPayload: ToolExecutionStartedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      arguments: { command: 'npm run dev', background: true },
    };

    handleToolApproved(approvedPayload, context);
    expect(segment.status).toBe('approved');

    handleToolExecutionStarted(startedPayload, context);
    expect(segment.status).toBe('executing');
    expect(segment.command).toBe('npm run dev');
    expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(agentId, invocationId, 'run_bash');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(agentId, invocationId, 'approved');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(agentId, invocationId, 'executing');
  });

  it('does not regress from executing back to approved', () => {
    const invocationId = 'bash-2';
    const segment = buildTerminalSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const startedPayload: ToolExecutionStartedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
      arguments: { command: 'python server.py' },
    };
    const approvedPayload: ToolApprovedPayload = {
      invocation_id: invocationId,
      tool_name: 'run_bash',
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
      arguments: { path: '/tmp/a.txt' },
    };
    const succeededPayload: ToolExecutionSucceededPayload = {
      invocation_id: invocationId,
      tool_name: 'read_file',
      result: { content: 'ok' },
    };

    handleToolExecutionStarted(startedPayload, context);
    handleToolExecutionSucceeded(succeededPayload, context);
    handleToolExecutionStarted(startedPayload, context);

    expect(segment.status).toBe('success');
    expect(segment.result).toEqual({ content: 'ok' });
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(agentId, invocationId, 'success');
  });

  it('applies failed terminal state and updates activity result', () => {
    const invocationId = 'tool-2';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolExecutionFailedPayload = {
      invocation_id: invocationId,
      tool_name: 'read_file',
      error: 'file not found',
    };

    handleToolExecutionFailed(payload, context);
    expect(segment.status).toBe('error');
    expect(segment.error).toBe('file not found');
    expect(mockActivityStore.setActivityResult).toHaveBeenCalledWith(agentId, invocationId, null, 'file not found');
  });

  it('applies denied terminal state when reason or error exists', () => {
    const invocationId = 'tool-3';
    const segment = buildToolCallSegment(invocationId);
    const context = buildContextWithSegment(segment);

    const payload: ToolDeniedPayload = {
      invocation_id: invocationId,
      tool_name: 'delete_file',
      reason: 'Denied by user',
    };

    handleToolDenied(payload, context);
    expect(segment.status).toBe('denied');
    expect(segment.error).toBe('Denied by user');
    expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(agentId, invocationId, 'denied');
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
      log_entry: '[TOOL_RESULT_DIRECT] {"ok":true}',
    };

    handleToolLog(payload, context);

    expect(segment.logs).toContain(payload.log_entry);
    expect(segment.status).toBe('executing');
    expect(mockActivityStore.addActivityLog).toHaveBeenCalledWith(agentId, invocationId, payload.log_entry);
    expect(mockActivityStore.updateActivityStatus).not.toHaveBeenCalled();
  });
});
