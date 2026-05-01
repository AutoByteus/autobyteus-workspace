import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findSegmentById, handleSegmentContent, handleSegmentEnd, handleSegmentStart } from '../segmentHandler';
import type { SegmentStartPayload } from '../../protocol/messageTypes';
import type { AgentContext } from '~/types/agent/AgentContext';

const buildContext = (): AgentContext =>
  ({
    state: {
      runId: 'test-agent-id',
    },
    conversation: {
      messages: [],
      updatedAt: '',
    },
  }) as any;

describe('segmentHandler', () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    mockContext = buildContext();
    vi.restoreAllMocks();
  });

  describe('handleSegmentStart', () => {
    it('creates a tool_call conversation segment from metadata without creating Activity state', () => {
      const payload: SegmentStartPayload = {
        id: 'test-id',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'read_file',
          arguments: { path: '/tmp/readme.md' },
        },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'test-id') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('tool_call');
      expect(segment.toolName).toBe('read_file');
      expect(segment.arguments).toEqual({ path: '/tmp/readme.md' });
      expect(mockContext.conversation.messages[0]?.type).toBe('ai');
      expect((mockContext.conversation.messages[0] as any).segments).toHaveLength(1);
    });

    it('hydrates tool_call arguments from metadata.arguments/query fields', () => {
      const payload: SegmentStartPayload = {
        id: 'search-call-1',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'search_web',
          arguments: { query: 'Elon Musk latest news' },
          queries: ['Elon Musk latest news', 'Elon Musk Reuters'],
        },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'search-call-1') as any;
      expect(segment.type).toBe('tool_call');
      expect(segment.toolName).toBe('search_web');
      expect(segment.arguments).toEqual({
        query: 'Elon Musk latest news',
        queries: ['Elon Musk latest news', 'Elon Musk Reuters'],
      });
    });

    it('hydrates tool_call arguments when metadata.arguments is serialized JSON', () => {
      const payload: SegmentStartPayload = {
        id: 'image-call-1',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {
          tool_name: 'generate_image',
          arguments: '{"prompt":"cute otter","output_file_path":"/tmp/cute-otter.png"}',
        },
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'image-call-1') as any;
      expect(segment.toolName).toBe('generate_image');
      expect(segment.arguments).toEqual({
        prompt: 'cute otter',
        output_file_path: '/tmp/cute-otter.png',
      });
    });

    it('does not treat missing tool_name as an Activity-store backend bug', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const payload: SegmentStartPayload = {
        id: 'test-id-missing',
        turn_id: 'turn-1',
        segment_type: 'tool_call',
        metadata: {},
      };

      handleSegmentStart(payload, mockContext);

      const segment = findSegmentById(mockContext, 'test-id-missing') as any;
      expect(segment).toBeTruthy();
      expect(segment.type).toBe('tool_call');
      expect(segment.toolName).toBe('');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
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
          turn_id: 'turn-1',
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
    });

    it('creates write_file/edit_file/run_bash transcript segments from metadata', () => {
      handleSegmentStart(
        {
          id: 'test-id-kf',
          turn_id: 'turn-1',
          segment_type: 'write_file',
          metadata: { path: '/tmp/foo.txt' },
        },
        mockContext,
      );
      handleSegmentStart(
        {
          id: 'test-id-pf',
          turn_id: 'turn-1',
          segment_type: 'edit_file',
          metadata: { path: '/tmp/bar.txt' },
        },
        mockContext,
      );
      handleSegmentStart(
        {
          id: 'test-id-bash',
          turn_id: 'turn-1',
          segment_type: 'run_bash',
          metadata: { command: 'python fibonacci.py' },
        },
        mockContext,
      );

      const writeSegment = findSegmentById(mockContext, 'test-id-kf') as any;
      const editSegment = findSegmentById(mockContext, 'test-id-pf') as any;
      const bashSegment = findSegmentById(mockContext, 'test-id-bash') as any;

      expect(writeSegment.type).toBe('write_file');
      expect(writeSegment.path).toBe('/tmp/foo.txt');
      expect(editSegment.type).toBe('edit_file');
      expect(editSegment.path).toBe('/tmp/bar.txt');
      expect(bashSegment.type).toBe('terminal_command');
      expect(bashSegment.command).toBe('python fibonacci.py');
      expect(bashSegment.arguments).toEqual({ command: 'python fibonacci.py' });
    });

    it('deduplicates repeated SEGMENT_START with same id', () => {
      const payload: SegmentStartPayload = {
        id: 'dup-send-message',
        turn_id: 'turn-1',
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
    });

    it('deduplicates cross-type start collisions and keeps a single segment', () => {
      handleSegmentStart(
        {
          id: 'dup-cross-type',
          turn_id: 'turn-1',
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
          turn_id: 'turn-1',
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
    });
  });

  describe('handleSegmentContent', () => {
    it('streams write_file content into the segment state', () => {
      handleSegmentStart(
        {
          id: 'seg-write',
          turn_id: 'turn-1',
          segment_type: 'write_file',
          metadata: { path: '/tmp/generated.txt' },
        },
        mockContext,
      );

      handleSegmentContent(
        {
          id: 'seg-write',
          turn_id: 'turn-1',
          delta: 'hello',
          segment_type: 'write_file',
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-write') as any;
      expect(segment.originalContent).toBe('hello');
    });

    it('creates a synthetic text segment when content arrives before segment start', () => {
      handleSegmentContent(
        {
          id: 'seg-fallback',
          turn_id: 'turn-1',
          delta: 'hello from fallback',
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.type).toBe('ai');
      expect(aiMessage.segments).toHaveLength(1);
      expect(aiMessage.segments[0].type).toBe('text');
      expect(aiMessage.segments[0].content).toBe('hello from fallback');
    });

    it('creates separate reasoning and tool segments when ids are reused across types', () => {
      handleSegmentContent(
        {
          id: 'seg-shared',
          turn_id: 'turn-1',
          delta: 'reasoning burst',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      handleSegmentStart(
        {
          id: 'seg-shared',
          turn_id: 'turn-1',
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
    it('retains write_file content when the segment ends', () => {
      handleSegmentStart(
        {
          id: 'seg-write-end',
          turn_id: 'turn-1',
          segment_type: 'write_file',
          metadata: { path: '/tmp/result.txt' },
        },
        mockContext,
      );

      handleSegmentContent(
        {
          id: 'seg-write-end',
          turn_id: 'turn-1',
          delta: 'done',
          segment_type: 'write_file',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-write-end',
          turn_id: 'turn-1',
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-write-end') as any;
      expect(segment.originalContent).toContain('done');
    });

    it('removes empty think segment on end', () => {
      handleSegmentStart(
        {
          id: 'seg-think-empty',
          turn_id: 'turn-1',
          segment_type: 'reasoning',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-think-empty',
          turn_id: 'turn-1',
        },
        mockContext,
      );

      const aiMessage = mockContext.conversation.messages[0] as any;
      expect(aiMessage.segments).toHaveLength(0);
    });

    it('applies end metadata path/patch to edit_file segment only', () => {
      handleSegmentStart(
        {
          id: 'seg-edit-meta',
          turn_id: 'turn-1',
          segment_type: 'edit_file',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-edit-meta',
          turn_id: 'turn-1',
          metadata: {
            tool_name: 'edit_file',
            path: '/tmp/fibonacci.py',
            patch: '@@ -0,0 +1,3 @@\n+print("fib")',
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-edit-meta') as any;
      expect(segment.type).toBe('edit_file');
      expect(segment.path).toBe('/tmp/fibonacci.py');
      expect(segment.originalContent).toBe('@@ -0,0 +1,3 @@\n+print("fib")');
      expect(segment.arguments?.path).toBe('/tmp/fibonacci.py');
      expect(segment.arguments?.patch).toBe('@@ -0,0 +1,3 @@\n+print("fib")');
      expect(segment.status).toBe('parsed');
    });

    it('applies end metadata command to run_bash segment only', () => {
      handleSegmentStart(
        {
          id: 'seg-bash-meta',
          turn_id: 'turn-1',
          segment_type: 'run_bash',
        },
        mockContext,
      );

      handleSegmentEnd(
        {
          id: 'seg-bash-meta',
          turn_id: 'turn-1',
          metadata: {
            tool_name: 'run_bash',
            command: "/bin/bash -lc 'python fibonacci.py'",
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-bash-meta') as any;
      expect(segment.type).toBe('terminal_command');
      expect(segment.command).toBe("/bin/bash -lc 'python fibonacci.py'");
      expect(segment.arguments?.command).toBe("/bin/bash -lc 'python fibonacci.py'");
      expect(segment.status).toBe('parsed');
    });

    it('applies end metadata arguments to tool_call segment only', () => {
      handleSegmentStart(
        {
          id: 'seg-tool-meta',
          turn_id: 'turn-1',
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
          turn_id: 'turn-1',
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
      expect(segment.type).toBe('tool_call');
      expect(segment.arguments).toEqual({
        query: 'Donald Trump latest Reuters',
        queries: ['Donald Trump latest Reuters'],
      });
      expect(segment.status).toBe('parsed');
    });

    it('does not downgrade an already-approved tool segment back to parsed on end', () => {
      handleSegmentStart(
        {
          id: 'seg-tool-approved',
          turn_id: 'turn-1',
          segment_type: 'tool_call',
          metadata: {
            tool_name: 'speak',
            arguments: {
              text: 'hello world',
              play: true,
            },
          },
        },
        mockContext,
      );

      const segment = findSegmentById(mockContext, 'seg-tool-approved') as any;
      segment.status = 'approved';

      handleSegmentEnd(
        {
          id: 'seg-tool-approved',
          turn_id: 'turn-1',
          metadata: {
            tool_name: 'speak',
            arguments: {
              text: 'hello world',
              play: true,
            },
          },
        },
        mockContext,
      );

      expect(segment.status).toBe('approved');
    });
  });
});
