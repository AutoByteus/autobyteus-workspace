import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAgentStatus,
  handleCompactionStatus,
  handleAssistantComplete,
  handleTurnCompleted,
  handleTurnInterrupted,
  handleError
} from '../agentStatusHandler';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentStatusPayload,
  AssistantCompletePayload,
  CompactionStatusPayload,
  ErrorPayload,
  TurnLifecyclePayload
} from '../../protocol/messageTypes';

const mockActivityStore = {
  updateActivityToolName: vi.fn(),
  updateActivityStatus: vi.fn(),
  setActivityResult: vi.fn(),
  addActivityLog: vi.fn(),
  getActivities: vi.fn(() => []),
};

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => mockActivityStore,
}));

const { mockFindOrCreateAIMessage, mockFindSegmentById } = vi.hoisted(() => ({
  mockFindOrCreateAIMessage: vi.fn((context) => {
    const last = context.conversation.messages[context.conversation.messages.length - 1];
    if (last && last.type === 'ai') return last;
    const newMsg = { type: 'ai', segments: [], isComplete: false };
    context.conversation.messages.push(newMsg);
    return newMsg;
  }),
  mockFindSegmentById: vi.fn((context, id: string) => {
    const explicit = context.__segmentsById?.[id];
    if (explicit) {
      return explicit;
    }
    for (const message of context.conversation.messages ?? []) {
      if (message?.type !== 'ai' || !Array.isArray(message.segments)) {
        continue;
      }
      for (const segment of message.segments) {
        if ((segment as any)._streamSegmentIdentity?.id === id || (segment as any).invocationId === id) {
          return segment;
        }
      }
    }
    return null;
  }),
}));

// Mock segment handler helpers used in handleError
vi.mock('../segmentHandler', () => ({
  findOrCreateAIMessage: mockFindOrCreateAIMessage,
  findSegmentById: mockFindSegmentById,
}));

describe('agentStatusHandler', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      state: { 
        currentStatus: AgentStatus.Idle,
        canInterrupt: false,
        compactionStatus: null,
        runId: 'run-1',
      },
      isSending: true,
      conversation: {
        messages: []
      }
    };
  });

  describe('handleAgentStatus', () => {
    it('updates currentStatus', () => {
      const payload: AgentStatusPayload = { status: 'running', can_interrupt: true };
      handleAgentStatus(payload, mockContext);
      expect(mockContext.state.currentStatus).toBe(AgentStatus.Running);
      expect(mockContext.state.canInterrupt).toBe(true);
    });

    it('sets isSending to false when status is Idle', () => {
      const payload: AgentStatusPayload = { status: 'idle', can_interrupt: false };
      handleAgentStatus(payload, mockContext);
      expect(mockContext.isSending).toBe(false);
      expect(mockContext.state.canInterrupt).toBe(false);
    });

    it('marks last AI message as complete when Idle', () => {
      const aiMsg = { type: 'ai', isComplete: false };
      mockContext.conversation.messages.push(aiMsg);
      
      const payload: AgentStatusPayload = { status: 'idle', can_interrupt: false };
      handleAgentStatus(payload, mockContext);
      
      expect(aiMsg.isComplete).toBe(true);
    });
  });

  describe('handleAssistantComplete', () => {
    it('marks last AI message as complete', () => {
      const aiMsg = { type: 'ai', isComplete: false };
      mockContext.conversation.messages.push(aiMsg);

      const payload: AssistantCompletePayload = {};
      handleAssistantComplete(payload, mockContext);

      expect(aiMsg.isComplete).toBe(true);
    });
  });

  describe('handleCompactionStatus', () => {
    it('stores a started compaction status with a friendly message', () => {
      const payload: CompactionStatusPayload = {
        phase: 'started',
        turn_id: 'turn-1',
        selected_block_count: 3,
        compacted_block_count: 2,
        raw_trace_count: 4,
        semantic_fact_count: 1,
        compaction_agent_definition_id: 'memory-compactor',
        compaction_agent_name: 'Memory Compactor',
        compaction_runtime_kind: 'codex_app_server',
        compaction_model_identifier: 'compaction-model',
        compaction_run_id: 'compaction-run-1',
        compaction_task_id: 'compaction-task-1',
      };

      handleCompactionStatus(payload, mockContext);

      expect(mockContext.state.compactionStatus).toEqual({
        phase: 'started',
        message: 'Compacting memory…',
        turnId: 'turn-1',
        selectedBlockCount: 3,
        compactedBlockCount: 2,
        rawTraceCount: 4,
        semanticFactCount: 1,
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        compactionRuntimeKind: 'codex_app_server',
        compactionModelIdentifier: 'compaction-model',
        compactionRunId: 'compaction-run-1',
        compactionTaskId: 'compaction-task-1',
        errorMessage: null,
      });
    });

    it('uses the failure error message when compaction fails', () => {
      const payload: CompactionStatusPayload = {
        phase: 'failed',
        turn_id: 'turn-2',
        error_message: 'Compaction failed hard',
      };

      handleCompactionStatus(payload, mockContext);

      expect(mockContext.state.compactionStatus).toMatchObject({
        phase: 'failed',
        message: 'Compaction failed hard',
        turnId: 'turn-2',
        errorMessage: 'Compaction failed hard',
      });
    });
  });

  describe('handleTurnCompleted', () => {
    it('marks last AI message as complete without owning send state', () => {
      const aiMsg = { type: 'ai', isComplete: false };
      mockContext.conversation.messages.push(aiMsg);

      const payload: TurnLifecyclePayload = { turn_id: 'turn-1' };
      handleTurnCompleted(payload, mockContext);

      expect(aiMsg.isComplete).toBe(true);
    });
  });

  describe('handleTurnInterrupted', () => {
    it('terminalizes pending approval tool rows without owning send state', () => {
      const toolSegment = {
        type: 'tool_call',
        invocationId: 'inv-pending',
        toolName: 'approval_tool',
        arguments: {},
        status: 'awaiting-approval',
        logs: [],
        result: null,
        error: null,
      };
      const aiMsg = { type: 'ai', isComplete: false, segments: [toolSegment] };
      mockContext.conversation.messages.push(aiMsg);

      const payload: TurnLifecyclePayload = {
        turn_id: 'turn-1',
        reason: 'user_interrupt',
        interrupted: true,
      };
      handleTurnInterrupted(payload, mockContext);

      expect(toolSegment.status).toBe('interrupted');
      expect(toolSegment.error).toBe('user_interrupt');
      expect(aiMsg.isComplete).toBe(true);
      expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-pending',
        'interrupted',
      );
      expect(mockActivityStore.setActivityResult).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-pending',
        null,
        'user_interrupt',
      );
    });
  });

  describe('handleError', () => {
    it('adds error segment without owning send state', () => {
      const payload: ErrorPayload = { code: 'TEST_ERR', message: 'Something went wrong' };
      handleError(payload, mockContext);

      const lastMsg = mockContext.conversation.messages[0];
      expect(lastMsg).toBeDefined();
      expect(lastMsg.segments).toHaveLength(1);
      expect(lastMsg.segments[0]).toEqual({
        type: 'error',
        source: 'TEST_ERR',
        message: 'Something went wrong'
      });
    });

    it('suppresses error segment for tool execution errors and updates tool segment', () => {
      const toolSegment = {
        type: 'tool_call',
        invocationId: 'inv-123',
        toolName: 'read_file',
        arguments: {},
        status: 'executing',
        logs: [],
        result: null,
        error: null,
      };

      const aiMsg = { type: 'ai', isComplete: false, segments: [toolSegment] };
      mockContext.conversation.messages.push(aiMsg);
      mockContext.__segmentsById = { 'inv-123': toolSegment };

      const payload: ErrorPayload = {
        code: 'TOOL_ERROR',
        message: "Error executing tool 'read_file' (ID: inv-123): failed to read file",
      };

      handleError(payload, mockContext);

      expect(aiMsg.segments).toHaveLength(1);
      expect(toolSegment.status).toBe('error');
      expect(toolSegment.error).toBe(payload.message);
      expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-123',
        'read_file',
      );
      expect(aiMsg.isComplete).toBe(true);
    });

    it('terminalizes open tool segments on generic stream errors', () => {
      const toolSegment = {
        type: 'tool_call',
        invocationId: 'inv-partial',
        toolName: 'search_web',
        arguments: {},
        status: 'parsing',
        logs: [],
        result: null,
        error: null,
      };

      const aiMsg = { type: 'ai', isComplete: false, segments: [toolSegment] };
      mockContext.conversation.messages.push(aiMsg);

      const payload: ErrorPayload = {
        code: 'LLM_STREAM_ERROR',
        message: 'stream exploded',
      };

      handleError(payload, mockContext);

      expect(toolSegment.status).toBe('error');
      expect(toolSegment.error).toBe('stream exploded');
      expect(toolSegment.result).toBeNull();
      expect(aiMsg.segments).toHaveLength(2);
      expect(aiMsg.segments[1]).toEqual({
        type: 'error',
        source: 'LLM_STREAM_ERROR',
        message: 'stream exploded',
      });
      expect(aiMsg.isComplete).toBe(true);
      expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-partial',
        'error',
      );
      expect(mockActivityStore.setActivityResult).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-partial',
        null,
        'stream exploded',
      );
    });
  });
});
