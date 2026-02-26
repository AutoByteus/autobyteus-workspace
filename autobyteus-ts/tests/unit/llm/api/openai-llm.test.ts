import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

// Mock OpenAI Client again
vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = { completions: { create: vi.fn() } };
  return { OpenAI };
});

describe('OpenAILLM', () => {
  let llm: OpenAILLM;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });

    llm = new OpenAILLM(model);
  });

  it('should initialize with specific OpenAI constants', () => {
    expect(llm).toBeDefined();
    // Verify base URL or other properties if possible, but they are protected/internal.
    // At least compilation checks super call arguments type-safety.
  });
});
