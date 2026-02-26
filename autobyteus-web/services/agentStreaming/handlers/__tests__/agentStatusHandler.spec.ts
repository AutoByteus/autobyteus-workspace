import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAgentStatus, handleAssistantComplete, handleError } from '../agentStatusHandler';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentStatusPayload, AssistantCompletePayload, ErrorPayload } from '../../protocol/messageTypes';

const mockActivityStore = {
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
    return context.__segmentsById?.[id] ?? null;
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
        currentStatus: AgentStatus.Uninitialized 
      },
      isSending: true,
      conversation: {
        messages: []
      }
    };
  });

  describe('handleAgentStatus', () => {
    it('updates currentStatus', () => {
      const payload: AgentStatusPayload = { new_status: 'processing_user_input', old_status: 'idle' };
      handleAgentStatus(payload, mockContext);
      expect(mockContext.state.currentStatus).toBe(AgentStatus.ProcessingUserInput);
    });

    it('sets isSending to false when status is Idle', () => {
      const payload: AgentStatusPayload = { new_status: 'idle', old_status: 'processing_user_input' };
      handleAgentStatus(payload, mockContext);
      expect(mockContext.isSending).toBe(false);
    });

    it('marks last AI message as complete when Idle', () => {
      const aiMsg = { type: 'ai', isComplete: false };
      mockContext.conversation.messages.push(aiMsg);
      
      const payload: AgentStatusPayload = { new_status: 'idle', old_status: 'processing_user_input' };
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

    it('hydrates text segment from assistant-complete payload when no segment stream exists', () => {
      const payload: AssistantCompletePayload = { content: 'Hello from complete payload' };
      handleAssistantComplete(payload, mockContext);

      const lastMsg = mockContext.conversation.messages[0];
      expect(lastMsg).toBeDefined();
      expect(lastMsg.isComplete).toBe(true);
      expect(lastMsg.segments).toEqual([
        {
          type: 'text',
          content: 'Hello from complete payload',
        },
      ]);
    });

    it('does not duplicate text segment when streamed text already exists', () => {
      const aiMsg = {
        type: 'ai',
        isComplete: false,
        segments: [{ type: 'text', content: 'streamed text' }],
      };
      mockContext.conversation.messages.push(aiMsg);

      const payload: AssistantCompletePayload = { content: 'fallback text should not duplicate' };
      handleAssistantComplete(payload, mockContext);

      expect(aiMsg.segments).toEqual([{ type: 'text', content: 'streamed text' }]);
      expect(aiMsg.isComplete).toBe(true);
    });
  });

  describe('handleError', () => {
    it('adds error segment and stops sending', () => {
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
      expect(mockContext.isSending).toBe(false);
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
      expect(mockContext.isSending).toBe(false);
      expect(aiMsg.isComplete).toBe(true);
    });
  });
});
