import { describe, it, expect } from 'vitest';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AvailableSkillsProcessor } from '../../../../src/agent/system-prompt-processor/available-skills-processor.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { SkillAccessMode } from '../../../../src/agent/context/skill-access-mode.js';

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
  it('uses only current default system prompt processors', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM());

    expect(config.systemPromptProcessors).toHaveLength(1);
    expect(config.systemPromptProcessors[0]).toBeInstanceOf(AvailableSkillsProcessor);
  });

  it('copy creates a new config with cloned lists and data', () => {
    const llm = makeLLM();
    const config = new AgentConfig('name', 'role', 'desc', llm, null, [{ name: 'tool' } as any], true, null, null, null, null, null, null, null, { nested: { value: 1 } }, ['skill-a']);

    const clone = config.copy();

    expect(clone).not.toBe(config);
    expect(clone.llmInstance).toBe(llm);
    expect(clone.tools).not.toBe(config.tools);
    expect(clone.tools).toEqual(config.tools);

    (clone.initialCustomData as any).nested.value = 2;
    expect((config.initialCustomData as any).nested.value).toBe(1);

    clone.skills.push('skill-b');
    expect(config.skills).toEqual(['skill-a']);
    expect(clone.skillAccessMode).toBe(config.skillAccessMode);
    expect(config).not.toHaveProperty('memoryCompactionStrategyId');
    expect(clone).not.toHaveProperty('memoryCompactionStrategyId');
    expect(config).not.toHaveProperty('compactionStrategyId');
  });

  it('defaults skillAccessMode to PRELOADED_ONLY when skills are configured', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM(), null, null, true, null, null, null, null, null, null, null, null, ['skill-a']);
    expect(config.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
  });

  it('defaults skillAccessMode to PRELOADED_ONLY when no skills are configured', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM());
    expect(config.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
  });

  it('respects explicit skillAccessMode', () => {
    const config = new AgentConfig('name', 'role', 'desc', makeLLM(), null, null, true, null, null, null, null, null, null, null, null, ['skill-a'], null, SkillAccessMode.NONE);
    expect(config.skillAccessMode).toBe(SkillAccessMode.NONE);
  });

  it('rejects unsupported skillAccessMode values', () => {
    expect(() => new AgentConfig('name', 'role', 'desc', makeLLM(), null, null, true, null, null, null, null, null, null, null, null, [], null, 'GLOBAL_DISCOVERY' as any)).toThrow(
      "Unsupported skill access mode",
    );
  });
});
