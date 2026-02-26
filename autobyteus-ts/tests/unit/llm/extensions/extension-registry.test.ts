import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionRegistry } from '../../../../src/llm/extensions/extension-registry.js';
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

class ExtA extends LLMExtension {
  async beforeInvoke(): Promise<void> {}
  async afterInvoke(): Promise<void> {}
}

class ExtB extends LLMExtension {
  async beforeInvoke(): Promise<void> {}
  async afterInvoke(): Promise<void> {}
}

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;
  let llm: DummyLLM;

  beforeEach(() => {
    registry = new ExtensionRegistry();
    llm = new DummyLLM({} as any, {} as any);
  });

  it('registers and retrieves by class', () => {
    const ext = new ExtA(llm);
    registry.register(ext);
    expect(registry.get(ExtA)).toBe(ext);
  });

  it('prevents duplicate registration by class', () => {
    const ext1 = new ExtA(llm);
    const ext2 = new ExtA(llm);
    registry.register(ext1);
    registry.register(ext2);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('unregister removes extension', () => {
    const ext = new ExtA(llm);
    registry.register(ext);
    registry.unregister(ext);
    expect(registry.get(ExtA)).toBeNull();
  });

  it('clear removes all', () => {
    registry.register(new ExtA(llm));
    registry.register(new ExtB(llm));
    registry.clear();
    expect(registry.getAll()).toEqual([]);
  });
});
