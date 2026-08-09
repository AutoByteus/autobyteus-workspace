import { describe, expect, it } from 'vitest';
import {
  buildCustomProviderId,
  normalizeProviderName,
} from '../../../src/llm/custom-llm-provider-identity.js';
import { parseCustomLlmProviderConfigFile } from '../../../src/llm/custom-llm-provider-config.js';
import { LLMProvider } from '../../../src/llm/providers.js';

describe('custom LLM provider readable identity', () => {
  it.each([
    ['Alibaba Cloud Token Plan', 'provider_alibaba_cloud_token_plan'],
    ['alibaba_cloud', 'provider_alibaba_cloud'],
    ['Qwen Zürich', 'provider_qwen_zurich'],
    ['阿里云', 'provider_u963f_u91cc_u4e91'],
    ['🚀', 'provider_u1f680'],
  ])('derives %s deterministically as %s', (name, expected) => {
    expect(buildCustomProviderId(name)).toBe(expected);
    expect(buildCustomProviderId(name)).toBe(expected);
  });

  it('normalizes compatibility forms and whitespace without locale dependence', () => {
    expect(normalizeProviderName('  Ｑｗｅｎ\t Zürich  ')).toBe('qwen zürich');
    expect(buildCustomProviderId('  Ｑｗｅｎ\t Zürich  ')).toBe('provider_qwen_zurich');
  });

  it('rejects a name with no derivable token instead of adding a suffix', () => {
    expect(() => buildCustomProviderId(' --- ___ !!! '))
      .toThrow('CUSTOM_PROVIDER_NAME_INVALID');
  });

  it('enforces V3 exact derived IDs plus canonical-name and ID uniqueness', () => {
    const record = {
      id: 'provider_alibaba_cloud',
      name: 'Alibaba Cloud',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://example.test/v1',
    };
    expect(parseCustomLlmProviderConfigFile({ version: 3, providers: [record] }))
      .toEqual({ version: 3, providers: [record] });
    expect(() => parseCustomLlmProviderConfigFile({
      version: 3,
      providers: [{ ...record, id: 'provider_random' }],
    })).toThrow();
    expect(() => parseCustomLlmProviderConfigFile({
      version: 3,
      providers: [record, { ...record, name: '  alibaba   cloud ' }],
    })).toThrow();
    expect(() => parseCustomLlmProviderConfigFile({ version: 2, providers: [] })).toThrow();
  });
});
