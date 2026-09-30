import { describe, it, expect } from 'vitest';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { createEnabledMemoryCompactionConfiguration } from '../../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../../src/memory/policies/compaction-policy.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeLLM = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  return new DummyLLM(model, new LLMConfig());
};

describe('AgentConfig', () => {
  it('copy creates a new config with cloned lists and data', () => {
    const llm = makeLLM();
    const toolResultProcessor = { process: () => undefined } as any;
    const toolInvocationPreprocessor = { process: () => undefined } as any;
    const config = new AgentConfig(
      'name',
      'role',
      'desc',
      llm,
      null,
      [{ name: 'tool' } as any],
      true,
      null,
      null,
      [toolResultProcessor],
      [toolInvocationPreprocessor],
      '/tmp/agent-config',
      null,
      { nested: { value: 1 } },
      ['skill-a']
    );

    const clone = config.copy();

    expect(clone).not.toBe(config);
    expect(clone.llmInstance).toBe(llm);
    expect(clone.tools).not.toBe(config.tools);
    expect(clone.tools).toEqual(config.tools);
    expect(clone.toolExecutionResultProcessors).toEqual([toolResultProcessor]);
    expect(clone.toolInvocationPreprocessors).toEqual([toolInvocationPreprocessor]);
    expect(clone.workspaceRootPath).toBe('/tmp/agent-config');
    expect(config).not.toHaveProperty(['system', 'Prompt', 'Processors'].join(''));

    (clone.initialCustomData as any).nested.value = 2;
    expect((config.initialCustomData as any).nested.value).toBe(1);

    clone.skills.push('skill-b');
    expect(config.skills).toEqual(['skill-a']);
    expect(config).not.toHaveProperty('memoryCompactionStrategyId');
    expect(clone).not.toHaveProperty('memoryCompactionStrategyId');
    expect(config).not.toHaveProperty('compactionStrategyId');
  });

  it('carries configured skills and no run-level skill switch', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM(), null, null, true, null, null, null, null, null, null, null, ['skill-a']);
    expect(config.skills).toEqual(['skill-a']);
    expect(config).not.toHaveProperty('skillAccessMode');
    expect(config.toString()).not.toContain('skillAccessMode');
  });

  it('defaults memory compaction to disabled', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM());
    expect(config.memoryCompaction).toEqual({ kind: 'disabled' });
    expect(config).not.toHaveProperty('compactionAgentRunner');
  });

  it('copies enabled memory compaction with a fresh policy and retained createCompressionStrategy identity', () => {
    const createCompressionStrategy = () => ({ compress: async (_content: string) => 'summary' });
    const memoryCompaction = createEnabledMemoryCompactionConfiguration(
      new CompactionPolicy({ triggerRatio: 0.2, maxItemChars: 1234, safetyMarginTokens: 77 }),
      createCompressionStrategy,
    );
    const config = new AgentConfig(
      'name', 'role', 'desc', makeLLM(), null, null, true, null, null, null, null,
      null, null, null, null, null, memoryCompaction,
    );

    const clone = config.copy();

    expect(clone.memoryCompaction.kind).toBe('enabled');
    if (clone.memoryCompaction.kind !== 'enabled') throw new Error('Expected enabled copy.');
    expect(clone.memoryCompaction.policy).not.toBe(memoryCompaction.policy);
    expect(clone.memoryCompaction.policy).toMatchObject({
      triggerRatio: 0.2,
      maxItemChars: 1234,
      safetyMarginTokens: 77,
    });
    expect(clone.memoryCompaction.createCompressionStrategy).toBe(createCompressionStrategy);
  });
});
