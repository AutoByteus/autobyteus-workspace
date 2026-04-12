import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LMStudioLLM } from '../../../../src/llm/api/lmstudio-llm.js';
import {
  createLocalLongRunningFetch,
  LOCAL_PROVIDER_SDK_TIMEOUT_MS,
} from '../../../../src/llm/transport/local-long-running-fetch.js';

const mockCreate = vi.hoisted(() => vi.fn());
const mockOpenAIConstructor = vi.hoisted(
  () =>
    vi.fn(function (
      this: { chat: { completions: { create: typeof mockCreate } } },
      _options?: Record<string, unknown>,
    ) {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }),
);

vi.mock('openai', () => ({
  OpenAI: mockOpenAIConstructor,
}));

describe('LMStudioLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockOpenAIConstructor.mockClear();
    process.env.LMSTUDIO_API_KEY = 'lmstudio-test-key';
  });

  it('injects the long-running local fetch and 24h SDK timeout into the OpenAI client', () => {
    const model = new LLMModel({
      name: 'gemma-4-31b-it',
      value: 'gemma-4-31b-it',
      canonicalName: 'gemma-4-31b-it',
      provider: LLMProvider.LMSTUDIO,
      hostUrl: 'http://127.0.0.1:1234/',
    });

    const llm = new LMStudioLLM(model, new LLMConfig());

    expect(llm).toBeDefined();
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'lmstudio-test-key',
      baseURL: 'http://127.0.0.1:1234/v1',
      fetch: createLocalLongRunningFetch(),
      timeout: LOCAL_PROVIDER_SDK_TIMEOUT_MS,
    });
  });
});
