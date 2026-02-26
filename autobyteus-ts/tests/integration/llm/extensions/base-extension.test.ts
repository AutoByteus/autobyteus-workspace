import { describe, it, expect } from 'vitest';
import { LLMExtension } from '../../../../src/llm/extensions/base-extension.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: '' });
  }
  async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<any, void, unknown> {
    yield;
  }
}

class DummyExtension extends LLMExtension {
  async beforeInvoke(): Promise<void> {}
  async afterInvoke(): Promise<void> {}
}

describe('LLMExtension (integration)', () => {
  it('cleanup resolves without error', async () => {
    const llm = new DummyLLM({} as any, {} as any);
    const ext = new DummyExtension(llm);
    await ext.cleanup();
    expect(true).toBe(true);
  });
});
