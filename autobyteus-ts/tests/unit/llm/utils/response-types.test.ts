import { describe, it, expect } from 'vitest';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

describe('ResponseTypes', () => {
  describe('CompleteResponse', () => {
    it('should initialize with defaults', () => {
      const resp = new CompleteResponse({ content: 'Hello' });
      expect(resp.content).toBe('Hello');
      expect(resp.reasoning).toBeNull();
      expect(resp.image_urls).toEqual([]);
    });

    it('fromContent factory', () => {
      const resp = CompleteResponse.fromContent('Hi');
      expect(resp).toBeInstanceOf(CompleteResponse);
      expect(resp.content).toBe('Hi');
    });
  });

  describe('ChunkResponse', () => {
    it('should initialize with defaults', () => {
      const chunk = new ChunkResponse({ content: 'part' });
      expect(chunk.content).toBe('part');
      expect(chunk.is_complete).toBe(false);
      expect(chunk.tool_calls).toBeNull();
    });

    it('should handle tool calls', () => {
      const chunk = new ChunkResponse({ 
        content: '', 
        tool_calls: [{ index: 0, name: 'fn' }] 
      });
      expect(chunk.tool_calls).toHaveLength(1);
      expect(chunk.tool_calls![0].name).toBe('fn');
    });
  });
});
