import { afterEach, describe, expect, it } from 'vitest';
import { QwenLLM } from '../../../src/llm/api/qwen-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import {
  DEFAULT_QWEN_BASE_URL,
  QWEN_BASE_URL_ENV_VAR,
  resolveQwenBaseUrl,
} from '../../../src/llm/qwen-provider-config.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';

const originalQwenBaseUrl = process.env[QWEN_BASE_URL_ENV_VAR];

afterEach(() => {
  if (originalQwenBaseUrl === undefined) delete process.env[QWEN_BASE_URL_ENV_VAR];
  else process.env[QWEN_BASE_URL_ENV_VAR] = originalQwenBaseUrl;
});

const model = new LLMModel({
  name: 'qwen3.8-max',
  value: 'qwen3.8-max',
  canonicalName: 'qwen3.8-max',
  provider: LLMProvider.QWEN,
});

const apiKeyResolver = { resolve: async () => {
  throw new Error('not used during construction');
} };

describe('Qwen provider configuration', () => {
  it('uses the historical default when no configured value is present', () => {
    delete process.env[QWEN_BASE_URL_ENV_VAR];
    expect(resolveQwenBaseUrl()).toBe(DEFAULT_QWEN_BASE_URL);
    expect(resolveQwenBaseUrl('   ')).toBe(DEFAULT_QWEN_BASE_URL);
  });

  it('normalizes configured absolute HTTP(S) URLs and rejects invalid manual values', () => {
    expect(resolveQwenBaseUrl(' https://regional.example.com/compatible-mode/v1/ '))
      .toBe('https://regional.example.com/compatible-mode/v1');
    expect(() => resolveQwenBaseUrl('ftp://regional.example.com/v1'))
      .toThrow('baseUrl must use http:// or https://');
  });

  it('constructs each new Qwen client with the current configured URL', () => {
    process.env[QWEN_BASE_URL_ENV_VAR] = 'https://token-plan.example.com/compatible-mode/v1/';
    const llm = new QwenLLM(model, new LLMConfig(), apiKeyResolver as never);
    expect((llm as unknown as { baseUrl: string }).baseUrl)
      .toBe('https://token-plan.example.com/compatible-mode/v1');
  });
});
