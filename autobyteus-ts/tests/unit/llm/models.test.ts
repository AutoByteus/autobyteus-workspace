import { describe, it, expect } from 'vitest';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';

describe('LLMModel', () => {
  it('should initialize and generate API identifier', () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI,
      runtime: LLMRuntime.API
    });
    
    expect(model.name).toBe('gpt-4o');
    expect(model.modelIdentifier).toBe('gpt-4o');
    expect(model.defaultConfig).toBeInstanceOf(LLMConfig);
  });

  it('should generate custom runtime identifier', () => {
    const model = new LLMModel({
      name: 'llama3',
      value: 'llama3',
      canonicalName: 'llama3',
      provider: LLMProvider.OLLAMA,
      runtime: LLMRuntime.OLLAMA,
      hostUrl: 'http://localhost:11434'
    });
    
    expect(model.modelIdentifier).toBe('llama3:ollama@localhost:11434');
  });

  it('should require hostUrl for non-API runtimes', () => {
    expect(() => {
      new LLMModel({
        name: 'test',
        value: 'test',
        canonicalName: 'test',
        provider: LLMProvider.OLLAMA,
        runtime: LLMRuntime.OLLAMA
      });
    }).toThrow(/hostUrl is required/);
  });
});
