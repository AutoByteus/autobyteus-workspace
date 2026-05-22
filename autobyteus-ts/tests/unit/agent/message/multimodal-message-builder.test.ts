import { describe, it, expect } from 'vitest';
import { buildLLMUserMessage } from '../../../../src/agent/message/multimodal-message-builder.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

const makeContextFiles = () => [
  new ContextFile('file:///image.png', ContextFileType.IMAGE),
  new ContextFile('file:///audio.mp3', ContextFileType.AUDIO),
  new ContextFile('file:///video.mp4', ContextFileType.VIDEO),
  new ContextFile('file:///notes.txt', ContextFileType.TEXT)
];

describe('buildLLMUserMessage', () => {
  it('builds a message with media urls and reference file paths', () => {
    const message = new AgentInputUserMessage('hello', undefined, makeContextFiles());
    const llmMessage = buildLLMUserMessage(message);

    expect(llmMessage.image_urls).toEqual(['file:///image.png']);
    expect(llmMessage.audio_urls).toEqual(['file:///audio.mp3']);
    expect(llmMessage.video_urls).toEqual(['file:///video.mp4']);
    expect(llmMessage.content).toBe(
      'hello\n\nReference files:\n- /image.png\n- /audio.mp3\n- /video.mp4\n- /notes.txt'
    );
  });

  it('dedupes reference file paths while preserving media arrays', () => {
    const message = new AgentInputUserMessage('hello', undefined, [
      new ContextFile('/abs/proof.png', ContextFileType.IMAGE),
      new ContextFile('/abs/proof.png', ContextFileType.IMAGE),
      new ContextFile('/abs/notes.txt', ContextFileType.TEXT)
    ]);
    const llmMessage = buildLLMUserMessage(message);

    expect(llmMessage.image_urls).toEqual(['/abs/proof.png', '/abs/proof.png']);
    expect(llmMessage.content).toBe(
      'hello\n\nReference files:\n- /abs/proof.png\n- /abs/notes.txt'
    );
  });

  it('handles messages without context files', () => {
    const message = new AgentInputUserMessage('hello');
    const llmMessage = buildLLMUserMessage(message);

    expect(llmMessage.image_urls).toEqual([]);
    expect(llmMessage.audio_urls).toEqual([]);
    expect(llmMessage.video_urls).toEqual([]);
    expect(llmMessage.content).toBe('hello');
  });
});
