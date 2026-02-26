import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

// Mock Anthropic Client
vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = {
    create: vi.fn()
  };
  return { default: Anthropic };
});

describe('AnthropicLLM', () => {
  let llm: AnthropicLLM;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const model = new LLMModel({
      name: 'claude-3-opus',
      value: 'claude-3-opus',
      canonicalName: 'claude-3-opus',
      provider: LLMProvider.ANTHROPIC
    });
    
    llm = new AnthropicLLM(model);
  });

  it('should initialize with API key', () => {
    expect(llm).toBeDefined();
  });
  
  it('should throw if API key missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const model = new LLMModel({
      name: 'claude',
      value: 'claude',
      canonicalName: 'claude',
      provider: LLMProvider.ANTHROPIC
    });
    expect(() => new AnthropicLLM(model)).toThrow(/environment variable is not set/);
  });
});
