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
  updateToolActivityToolName: vi.fn(),
  updateToolActivityStatus: vi.fn(),
  setToolActivityResult: vi.fn(),
  addToolActivityLog: vi.fn(),
  getToolActivities: vi.fn(() => []),
  upsertCompactionActivity: vi.fn(),
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
        compaction_operation_id: 'operation-1',
        requested_turn_id: 'turn-requested',
        execution_turn_id: 'turn-1',
        compaction_agent_definition_id: 'memory-compactor',
        compaction_agent_name: 'Memory Compactor',
        compaction_runtime_kind: 'codex_app_server',
        compaction_model_identifier: 'compaction-model',
        compaction_run_id: 'compaction-run-1',
        compaction_task_id: 'compaction-task-1',
      };

      handleCompactionStatus(payload, mockContext);

      expect(mockContext.state.compactionStatus).toEqual({
        activityId: 'compaction:operation:operation-1',
        phase: 'started',
        message: 'Compacting memory…',
        turnId: 'turn-1',
        compactionOperationId: 'operation-1',
        requestedTurnId: 'turn-requested',
        executionTurnId: 'turn-1',
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
        centerTimelineTimestamp: expect.any(Date),
      });
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenCalledWith(
        mockContext.state.runId,
        expect.objectContaining({
          kind: 'compaction',
          activityId: 'compaction:operation:operation-1',
          phase: 'started',
          compactionRunId: 'compaction-run-1',
          compactionTaskId: 'compaction-task-1',
        }),
      );
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
        centerTimelineTimestamp: expect.any(Date),
      });
    });

    it('splits the current visual AI block only on the first center-eligible execution phase', () => {
      const aiMsg = { type: 'ai', isComplete: false, segments: [{ type: 'text', content: 'before compaction' }] };
      mockContext.conversation.messages.push(aiMsg);

      handleCompactionStatus({
        phase: 'requested',
        compaction_operation_id: 'operation-split-1',
        requested_turn_id: 'turn-1',
      }, mockContext);
      expect(aiMsg.isComplete).toBe(false);

      handleCompactionStatus({
        phase: 'started',
        compaction_operation_id: 'operation-split-1',
        requested_turn_id: 'turn-1',
        execution_turn_id: 'turn-2',
      }, mockContext);
      expect(aiMsg.isComplete).toBe(true);

      aiMsg.isComplete = false;
      handleCompactionStatus({
        phase: 'completed',
        compaction_operation_id: 'operation-split-1',
        requested_turn_id: 'turn-1',
        execution_turn_id: 'turn-2',
      }, mockContext);
      expect(aiMsg.isComplete).toBe(false);
    });


    it('normalizes provider compaction boundary status into a compaction activity', () => {
      const payload: CompactionStatusPayload = {
        kind: 'provider_compaction_boundary',
        status: 'compacted',
        turn_id: 'turn-provider',
        provider: 'codex',
        source_surface: 'codex.thread_compacted',
        boundary_key: 'boundary-1',
      };

      handleCompactionStatus(payload, mockContext);

      expect(mockContext.state.compactionStatus).toMatchObject({
        activityId: 'compaction:boundary:boundary-1',
        phase: 'completed',
        message: 'Provider context compaction boundary recorded',
        turnId: 'turn-provider',
      });
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenCalledWith(
        mockContext.state.runId,
        expect.objectContaining({
          kind: 'compaction',
          activityId: 'compaction:boundary:boundary-1',
          phase: 'completed',
          provider: 'codex',
        }),
      );
    });

    it('uses provider operation identity across compacting and compacted boundary keys', () => {
      handleCompactionStatus({
        kind: 'provider_compaction_boundary',
        status: 'compacting',
        turn_id: 'turn-claude',
        provider: 'claude',
        source_surface: 'claude.status_compacting',
        boundary_key: 'claude:session-1:claude.status_compacting:operation-1:turn-claude',
        provider_session_id: 'session-1',
        provider_event_id: 'operation-1',
      }, mockContext);

      handleCompactionStatus({
        kind: 'provider_compaction_boundary',
        status: 'compacted',
        turn_id: 'turn-claude',
        provider: 'claude',
        source_surface: 'claude.compact_boundary',
        boundary_key: 'claude:session-1:claude.compact_boundary:operation-1:turn-claude',
        provider_session_id: 'session-1',
        provider_event_id: 'operation-1',
        rotation_eligible: true,
      }, mockContext);

      const expectedActivityId = 'compaction:provider:claude:session-1:operation-1:turn-claude';
      expect(mockContext.state.compactionStatus).toMatchObject({
        activityId: expectedActivityId,
        phase: 'completed',
        provider: 'claude',
        providerEventId: 'operation-1',
        providerSessionId: 'session-1',
      });
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenNthCalledWith(
        1,
        mockContext.state.runId,
        expect.objectContaining({
          activityId: expectedActivityId,
          phase: 'started',
          boundaryKey: 'claude:session-1:claude.status_compacting:operation-1:turn-claude',
        }),
      );
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenNthCalledWith(
        2,
        mockContext.state.runId,
        expect.objectContaining({
          activityId: expectedActivityId,
          phase: 'completed',
          boundaryKey: 'claude:session-1:claude.compact_boundary:operation-1:turn-claude',
        }),
      );
    });

    it('reuses a previous active provider row before falling back to a new boundary key', () => {
      handleCompactionStatus({
        kind: 'provider_compaction_boundary',
        status: 'compacting',
        turn_id: 'turn-provider-active',
        provider: 'claude',
        source_surface: 'claude.status_compacting',
        boundary_key: 'status-boundary',
      }, mockContext);

      handleCompactionStatus({
        kind: 'provider_compaction_boundary',
        status: 'compacted',
        turn_id: 'turn-provider-active',
        provider: 'claude',
        source_surface: 'claude.compact_boundary',
        boundary_key: 'completed-boundary',
      }, mockContext);

      expect(mockContext.state.compactionStatus).toMatchObject({
        activityId: 'compaction:boundary:status-boundary',
        phase: 'completed',
      });
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenNthCalledWith(
        2,
        mockContext.state.runId,
        expect.objectContaining({
          activityId: 'compaction:boundary:status-boundary',
          phase: 'completed',
          boundaryKey: 'completed-boundary',
        }),
      );
    });

    it('does not merge provider boundaries into an active semantic compaction row', () => {
      handleCompactionStatus({
        phase: 'requested',
        turn_id: 'turn-shared',
        compaction_operation_id: 'semantic-operation-1',
        requested_turn_id: 'turn-shared',
      }, mockContext);

      handleCompactionStatus({
        kind: 'provider_compaction_boundary',
        status: 'compacted',
        turn_id: 'turn-shared',
        provider: 'claude',
        source_surface: 'claude.compact_boundary',
        boundary_key: 'provider-boundary-1',
      }, mockContext);

      expect(mockContext.state.compactionStatus).toMatchObject({
        activityId: 'compaction:boundary:provider-boundary-1',
        phase: 'completed',
        provider: 'claude',
      });
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenNthCalledWith(
        1,
        mockContext.state.runId,
        expect.objectContaining({
          activityId: 'compaction:operation:semantic-operation-1',
          phase: 'requested',
        }),
      );
      expect(mockActivityStore.upsertCompactionActivity).toHaveBeenNthCalledWith(
        2,
        mockContext.state.runId,
        expect.objectContaining({
          activityId: 'compaction:boundary:provider-boundary-1',
          phase: 'completed',
        }),
      );
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
      expect(mockActivityStore.updateToolActivityStatus).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-pending',
        'interrupted',
      );
      expect(mockActivityStore.setToolActivityResult).toHaveBeenCalledWith(
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
      expect(mockActivityStore.updateToolActivityToolName).toHaveBeenCalledWith(
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
      expect(mockActivityStore.updateToolActivityStatus).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-partial',
        'error',
      );
      expect(mockActivityStore.setToolActivityResult).toHaveBeenCalledWith(
        mockContext.state.runId,
        'inv-partial',
        null,
        'stream exploded',
      );
    });
  });
});
