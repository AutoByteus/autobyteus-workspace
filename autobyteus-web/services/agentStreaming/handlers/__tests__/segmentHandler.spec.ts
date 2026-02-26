import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSegmentStart } from '../segmentHandler';
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
        agentId: 'test-agent-id',
      },
      conversation: {
        messages: [],
        updatedAt: '',
      },
    } as any;

    mockActivityStore = {
      addActivity: vi.fn(),
    };

    (useAgentActivityStore as any).mockReturnValue(mockActivityStore);
    
    // Spy on console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('handleSegmentStart', () => {


    it('should drop SEGMENT_START when id is missing', () => {
      const payload = {
        id: '',
        segment_type: 'tool_call',
        metadata: { tool_name: 'read_file' },
      } as unknown as SegmentStartPayload;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      handleSegmentStart(payload, mockContext);

      expect(warnSpy).toHaveBeenCalledWith(
        '[SegmentHandler] Dropping SEGMENT_START with invalid id',
        payload,
      );
      expect(mockActivityStore.addActivity).not.toHaveBeenCalled();
    });

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
  });
});
