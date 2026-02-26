import { describe, it, expect } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('Message', () => {
  it('should initialize with string content', () => {
    const msg = new Message(MessageRole.USER, 'Hello');
    expect(msg.role).toBe(MessageRole.USER);
    expect(msg.content).toBe('Hello');
    expect(msg.image_urls).toEqual([]);
  });

  it('should initialize with options', () => {
    const msg = new Message(MessageRole.ASSISTANT, {
      content: 'Hi',
      reasoning_content: 'Thinking...',
      image_urls: ['img1.png']
    });
    expect(msg.role).toBe(MessageRole.ASSISTANT);
    expect(msg.content).toBe('Hi');
    expect(msg.reasoning_content).toBe('Thinking...');
    expect(msg.image_urls).toEqual(['img1.png']);
  });

  it('should handle partial options', () => {
    const msg = new Message(MessageRole.SYSTEM, { content: 'System prompt' });
    expect(msg.role).toBe(MessageRole.SYSTEM);
    expect(msg.content).toBe('System prompt');
    expect(msg.audio_urls).toEqual([]);
  });

  it('should convert to dict', () => {
    const msg = new Message(MessageRole.USER, 'Test');
    const dict = msg.toDict();
    expect(dict).toMatchObject({
      role: 'user',
      content: 'Test',
      reasoning_content: null,
      image_urls: [],
      tool_payload: null
    });
  });

  it('should serialize tool call payload', () => {
    const msg = new Message(MessageRole.ASSISTANT, {
      content: null,
      tool_payload: new ToolCallPayload([
        { id: 'call_1', name: 'list_directory', arguments: { path: 'src' } }
      ])
    });
    const dict = msg.toDict();
    expect(dict).toMatchObject({
      role: 'assistant',
      content: null,
      tool_payload: {
        tool_calls: [
          { id: 'call_1', name: 'list_directory', arguments: { path: 'src' } }
        ]
      }
    });
  });

  it('should serialize tool result payload', () => {
    const msg = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call_1', 'list_directory', ['app.py'])
    });
    const dict = msg.toDict();
    expect(dict).toMatchObject({
      role: 'tool',
      tool_payload: {
        tool_call_id: 'call_1',
        tool_name: 'list_directory',
        tool_result: ['app.py'],
        tool_error: null
      }
    });
  });
});
