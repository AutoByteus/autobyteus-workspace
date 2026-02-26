import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

// Mock OpenAI Client
vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = {
    completions: {
      create: vi.fn()
    }
  };
  return { OpenAI };
});

describe('OpenAICompatibleLLM', () => {
  let llm: OpenAICompatibleLLM;
  
  beforeEach(() => {
    process.env.TEST_API_KEY = 'sk-test';
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    
    llm = new OpenAICompatibleLLM(
      model,
      'TEST_API_KEY',
      'https://api.openai.com/v1'
    );
  });

  it('should initialize with API key', () => {
    // Construction successful if no error thrown
    expect(llm).toBeDefined();
  });

  it('should throw if API key missing', () => {
    delete process.env.MISSING_KEY;
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    
    expect(() => {
      new OpenAICompatibleLLM(
        model,
        'MISSING_KEY',
        'url'
      );
    }).toThrow(/environment variable is not set/);
  });
});
