import { describe, it, expect } from 'vitest';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

describe('AgentInputUserMessage', () => {
  it('defaults to USER sender type', () => {
    const message = new AgentInputUserMessage('hello');
    expect(message.senderType).toBe(SenderType.USER);
    expect(message.metadata).toEqual({});
  });

  it('serializes and deserializes with context files', () => {
    const contextFile = new ContextFile('notes.txt', ContextFileType.TEXT);
    const message = new AgentInputUserMessage('hello', SenderType.USER, [contextFile], { key: 'value' });

    const data = message.toDict();
    const restored = AgentInputUserMessage.fromDict(data);

    expect(restored.content).toBe('hello');
    expect(restored.senderType).toBe(SenderType.USER);
    expect(restored.contextFiles?.length).toBe(1);
    expect(restored.contextFiles?.[0].uri).toBe('notes.txt');
    expect(restored.metadata).toEqual({ key: 'value' });
  });

  it('defaults to USER for invalid sender_type in fromDict', () => {
    const restored = AgentInputUserMessage.fromDict({
      content: 'hello',
      sender_type: 'invalid',
      context_files: null,
      metadata: {}
    });
    expect(restored.senderType).toBe(SenderType.USER);
  });

  it('throws when content is not a string', () => {
    expect(() => new AgentInputUserMessage(123 as any)).toThrow();
  });
});
