import { describe, it, expect } from 'vitest';
import { LLMExtension } from '../../../../src/llm/extensions/base-extension.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { Message } from '../../../../src/llm/utils/messages.js';

class DummyLLM extends BaseLLM {
  async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
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

describe('LLMExtension', () => {
  it('supports optional hooks without throwing', () => {
    const llm = new DummyLLM({} as any, {} as any);
    const ext = new DummyExtension(llm);
    void ext.beforeInvoke([new Message('user' as any, 'hi')]);
    void ext.afterInvoke([new Message('assistant' as any, 'ok')], null);
    expect(ext).toBeInstanceOf(LLMExtension);
  });
});
