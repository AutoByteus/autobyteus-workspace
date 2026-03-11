import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findSegmentById, handleSegmentContent, handleSegmentEnd, handleSegmentStart } from '../segmentHandler';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { createPinia, setActivePinia } from 'pinia';
import type { SegmentStartPayload } from '../../protocol/messageTypes';
import type { AgentContext } from '~/types/agent/AgentContext';

// Mock dependencies
vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: vi.fn(),
}));

describe('segmentHandler', () => {
  let mockContext: AgentContext;
  let mockActivityStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    
    mockContext = {
      state: {
        runId: 'test-agent-id',
      },
      conversation: {
        messages: [],
        updatedAt: '',
      },
    } as any;

    mockActivityStore = {
      addActivity: vi.fn(),
      updateActivityStatus: vi.fn(),
      updateActivityArguments: vi.fn(),
      updateActivityToolName: vi.fn(),
    };

    (useAgentActivityStore as any).mockReturnValue(mockActivityStore);
    
    // Spy on console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('handleSegmentStart', () => {
    it('should correctly set toolName from metadata for tool_call segments', () => {
      const payload: SegmentStartPayload = {
        id: 'test-id',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'read_file',
        },
      };

      handleSegmentStart(payload, mockContext);

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'read_file',
          type: 'tool_call',
        })
      );
    });

    it('hydrates tool_call arguments from metadata.arguments/query fields', () => {
      const payload: SegmentStartPayload = {
        id: 'search-call-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'search_web',
          arguments: { query: 'Elon Musk latest news' },
          queries: ['Elon Musk latest news', 'Elon Musk Reuters'],
        },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'search-call-1') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('tool_call');
      expect(segment.toolName).toBe('search_web');
      expect(segment.arguments).toEqual({
        query: 'Elon Musk latest news',
        queries: ['Elon Musk latest news', 'Elon Musk Reuters'],
      });

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'search_web',
          type: 'tool_call',
          arguments: {
            query: 'Elon Musk latest news',
            queries: ['Elon Musk latest news', 'Elon Musk Reuters'],
          },
        }),
      );
    });

    it('hydrates tool_call arguments when metadata.arguments is serialized JSON', () => {
      const payload: SegmentStartPayload = {
        id: 'image-call-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'generate_image',
          arguments:
            '{"prompt":"cute otter","output_file_path":"/tmp/cute-otter.png"}',
        },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'image-call-1') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('tool_call');
      expect(segment.toolName).toBe('generate_image');
      expect(segment.arguments).toEqual({
        prompt: 'cute otter',
        output_file_path: '/tmp/cute-otter.png',
      });

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'generate_image',
          type: 'tool_call',
          arguments: {
            prompt: 'cute otter',
            output_file_path: '/tmp/cute-otter.png',
          },
        }),
      );
    });

    it('should log error and use placeholder when tool_name is missing in metadata for tool_call', () => {
      const payload: SegmentStartPayload = {
        id: 'test-id-missing',
        segment_type: 'tool_call',
        metadata: {}, 
      };

      handleSegmentStart(payload, mockContext);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Backend Bug: Missing tool_name in metadata')
      );

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'MISSING_TOOL_NAME', 
          type: 'tool_call',
        })
      );
    });

    it('replaces unknown_tool when a later SEGMENT_START provides the concrete tool name', () => {
      mockContext.conversation.messages.push({
        type: 'ai',
        text: '',
        timestamp: new Date(),
        isComplete: false,
        segments: [
          {
            type: 'tool_call',
            invocationId: 'send-msg-1',
            toolName: 'unknown_tool',
            arguments: {},
            status: 'parsing',
            logs: [],
            result: null,
            error: null,
            rawContent: '',
            _streamSegmentIdentity: {
              id: 'send-msg-1',
              lookupKey: null,
            },
          },
        ],
      } as any);

      handleSegmentStart(
        {
          id: 'send-msg-1',
          segment_type: 'tool_call',
          metadata: {
            tool_name: 'send_message_to',
            arguments: {
              recipient_name: 'Student',
              content: 'Question for you',
            },
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'send-msg-1') as any;
      expect(segment.toolName).toBe('send_message_to');
      expect(segment.arguments).toEqual({
        recipient_name: 'Student',
        content: 'Question for you',
      });
      expect(mockActivityStore.updateActivityToolName).toHaveBeenCalledWith(
        'test-agent-id',
        'send-msg-1',
        'send_message_to',
      );
    });

    it('should NOT log error for other segment types (e.g. write_file)', () => {
       const payload: SegmentStartPayload = {
        id: 'test-id-kf',
        segment_type: 'write_file',
        metadata: { path: '/tmp/foo.txt' }, 
      };

      handleSegmentStart(payload, mockContext);

      expect(console.error).not.toHaveBeenCalled();
      
      // write_file uses segment_type as toolName initially or handled differently? 
      // Based on current code it uses segment_type
      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          type: 'write_file',
        })
      );
    });

    it('should correctly handle edit_file segments', () => {
      const payload: SegmentStartPayload = {
        id: 'test-id-pf',
        segment_type: 'edit_file',
        metadata: { path: '/tmp/bar.txt' },
      };

      handleSegmentStart(payload, mockContext);

      expect(console.error).not.toHaveBeenCalled();

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'edit_file',
          type: 'edit_file',
          arguments: { path: '/tmp/bar.txt' },
        })
      );
    });

    it('hydrates run_bash command from start metadata', () => {
      const payload: SegmentStartPayload = {
        id: 'test-id-bash',
        segment_type: 'run_bash',
        metadata: { command: "python fibonacci.py" },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'test-id-bash') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('terminal_command');
      expect(segment.command).toBe('python fibonacci.py');

      expect(mockActivityStore.addActivity).toHaveBeenCalledWith(
        'test-agent-id',
        expect.objectContaining({
          toolName: 'run_bash',
          type: 'terminal_command',
          contextText: 'python fibonacci.py',
          arguments: { command: 'python fibonacci.py' },
        })
      );
    });

    it('deduplicates repeated SEGMENT_START with same id', () => {
      const payload: SegmentStartPayload = {
        id: 'dup-send-message',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'send_message_to',
          arguments: {
            recipient_name: 'Student',
            content: 'hello',
          },
        },
      };

      handleSegmentStart(payload, mockContext);
      handleSegmentStart(payload, mockContext);

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.segments).toHaveLength(1);
      expect(aiMessage.segments[0].type).toBe('tool_call');
      expect(aiMessage.segments[0].toolName).toBe('send_message_to');
      expect(aiMessage.segments[0].arguments).toEqual({
        recipient_name: 'Student',
        content: 'hello',
      });
      expect(mockActivityStore.addActivity).toHaveBeenCalledTimes(1);
    });

    it('deduplicates cross-type start collisions and keeps a single segment', () => {
      handleSegmentStart(
        {
          id: 'dup-cross-type',
          segment_type: 'tool_call',
          metadata: {
            tool_name: 'send_message_to',
            arguments: { recipient_name: 'Student', content: 'hello' },
          },
        },
        mockContext,
      );

      handleSegmentStart(
        {
          id: 'dup-cross-type',
          segment_type: 'run_bash',
          metadata: {
            tool_name: 'send_message_to',
            command: 'send_message_to',
          },
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.segments).toHaveLength(1);
      expect(aiMessage.segments[0].type).toBe('tool_call');
      expect(aiMessage.segments[0].toolName).toBe('send_message_to');
      expect(mockActivityStore.addActivity).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSegmentContent', () => {
    it('creates fallback text segment when content arrives before segment start', () => {
      handleSegmentContent(
        {
          id: 'seg-fallback',
          delta: 'hello from fallback',
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage).toBeDefined();
      expect(aiMessage.type).toBe('ai');
      expect(aiMessage.segments).toHaveLength(1);
      expect(aiMessage.segments[0].type).toBe('text');
      expect(aiMessage.segments[0].content).toBe('hello from fallback');
    });

    it('creates fallback think segment when reasoning content arrives before segment start', () => {
      handleSegmentContent(
        {
          id: 'seg-reasoning',
          delta: 'reasoning summary',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage).toBeDefined();
      expect(aiMessage.segments).toHaveLength(1);
      expect(aiMessage.segments[0].type).toBe('think');
      expect(aiMessage.segments[0].content).toBe('reasoning summary');
    });

    it('creates a second think segment when later reasoning arrives with a new segment id', () => {
      handleSegmentContent(
        {
          id: 'seg-reasoning-1',
          delta: 'first burst',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      handleSegmentStart(
        {
          id: 'seg-run-bash',
          segment_type: 'run_bash',
          metadata: { command: 'echo hello' },
        },
        mockContext,
      );

      handleSegmentContent(
        {
          id: 'seg-reasoning-2',
          delta: 'second burst',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.segments).toHaveLength(3);
      expect(aiMessage.segments[0].type).toBe('think');
      expect(aiMessage.segments[0].content).toBe('first burst');
      expect(aiMessage.segments[1].type).toBe('terminal_command');
      expect(aiMessage.segments[2].type).toBe('think');
      expect(aiMessage.segments[2].content).toBe('second burst');
    });

    it('treats segment id plus segment type as the preferred identity when ids are reused', () => {
      handleSegmentContent(
        {
          id: 'seg-shared',
          delta: 'reasoning burst',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      handleSegmentStart(
        {
          id: 'seg-shared',
          segment_type: 'run_bash',
          metadata: { command: 'echo shared' },
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.segments).toHaveLength(2);
      expect(aiMessage.segments[0].type).toBe('think');
      expect(aiMessage.segments[0].content).toBe('reasoning burst');
      expect(aiMessage.segments[1].type).toBe('terminal_command');
      expect(aiMessage.segments[1].command).toBe('echo shared');
    });
  });

  describe('handleSegmentEnd', () => {
    it('removes empty think segment on end', () => {
      handleSegmentStart(
        {
          id: 'seg-think-empty',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      const aiMessageBefore = mockContext.conversation.messages[0] as any;
      expect(aiMessageBefore.segments).toHaveLength(1);
      expect(aiMessageBefore.segments[0].type).toBe('think');

      handleSegmentEnd(
        {
          id: 'seg-think-empty',
        },
        mockContext,
      );

      const aiMessageAfter = mockContext.conversation.messages[0] as any;
      expect(aiMessageAfter.segments).toHaveLength(0);
    });

    it('applies end metadata path/patch to edit_file segment and activity args', () => {
      handleSegmentStart(
        {
          id: 'seg-edit-meta',
          segment_type: 'edit_file',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-edit-meta',
          metadata: {
            tool_name: 'edit_file',
            path: '/tmp/fibonacci.py',
            patch: '@@ -0,0 +1,3 @@\\n+print(\"fib\")',
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-edit-meta') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('edit_file');
      expect(segment.path).toBe('/tmp/fibonacci.py');
      expect(segment.originalContent).toBe('@@ -0,0 +1,3 @@\\n+print(\"fib\")');
      expect(segment.arguments?.path).toBe('/tmp/fibonacci.py');
      expect(segment.arguments?.patch).toBe('@@ -0,0 +1,3 @@\\n+print(\"fib\")');
      expect(segment.status).toBe('parsed');

      expect(mockActivityStore.updateActivityStatus).toHaveBeenCalledWith(
        'test-agent-id',
        'seg-edit-meta',
        'parsed',
      );
      expect(mockActivityStore.updateActivityArguments).toHaveBeenCalledWith(
        'test-agent-id',
        'seg-edit-meta',
        {
          path: '/tmp/fibonacci.py',
          patch: '@@ -0,0 +1,3 @@\\n+print(\"fib\")',
        },
      );
    });

    it('applies end metadata command to run_bash segment and activity args', () => {
      handleSegmentStart(
        {
          id: 'seg-bash-meta',
          segment_type: 'run_bash',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-bash-meta',
          metadata: {
            tool_name: 'run_bash',
            command: "/bin/bash -lc 'python fibonacci.py'",
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-bash-meta') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('terminal_command');
      expect(segment.command).toBe("/bin/bash -lc 'python fibonacci.py'");
      expect(segment.arguments?.command).toBe("/bin/bash -lc 'python fibonacci.py'");
      expect(segment.status).toBe('parsed');

      expect(mockActivityStore.updateActivityArguments).toHaveBeenCalledWith(
        'test-agent-id',
        'seg-bash-meta',
        {
          command: "/bin/bash -lc 'python fibonacci.py'",
        },
      );
    });

    it('applies end metadata arguments to tool_call segment and activity args', () => {
      handleSegmentStart(
        {
          id: 'seg-tool-meta',
          segment_type: 'tool_call',
          metadata: {
            tool_name: 'search_web',
          },
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-tool-meta',
          metadata: {
            tool_name: 'search_web',
            arguments: {
              query: 'Donald Trump latest Reuters',
              queries: ['Donald Trump latest Reuters'],
            },
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-tool-meta') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('tool_call');
      expect(segment.arguments).toEqual({
        query: 'Donald Trump latest Reuters',
        queries: ['Donald Trump latest Reuters'],
      });
      expect(segment.status).toBe('parsed');

      expect(mockActivityStore.updateActivityArguments).toHaveBeenCalledWith(
        'test-agent-id',
        'seg-tool-meta',
        {
          query: 'Donald Trump latest Reuters',
          queries: ['Donald Trump latest Reuters'],
        },
      );
    });
  });
});
