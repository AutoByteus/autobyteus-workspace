import { describe, it, expect } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { LLMProvider } from '../../../src/llm/providers.js';

class ConcreteLLM extends BaseLLM {
  async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'Mock response' });
  }
  async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'Chunk1' });
    yield new ChunkResponse({ content: 'Chunk2', is_complete: true });
  }
}

describe('BaseLLM (integration)', () => {
  it('streams user message', async () => {
    const model = new LLMModel({
      name: 'test',
      value: 'test',
      canonicalName: 'test',
      provider: LLMProvider.OPENAI
    });
    const llm = new ConcreteLLM(model, new LLMConfig());
    const chunks: string[] = [];
    for await (const chunk of llm.streamUserMessage(new LLMUserMessage({ content: 'Hi' }))) {
      chunks.push(chunk.content);
    }
    expect(chunks).toEqual(['Chunk1', 'Chunk2']);
  });
});
