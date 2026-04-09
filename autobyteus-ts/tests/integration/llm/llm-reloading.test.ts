import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockOllamaList = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const MockOllama = vi.hoisted(
  () =>
    class {
      list = mockOllamaList;
    },
);

vi.mock('ollama', () => ({
  Ollama: MockOllama,
}));

import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LMStudioLLM } from '../../../src/llm/api/lmstudio-llm.js';
import { LMStudioModelProvider } from '../../../src/llm/lmstudio-provider.js';
import { OllamaModelProvider } from '../../../src/llm/ollama-provider.js';
import { AutobyteusModelProvider } from '../../../src/llm/autobyteus-provider.js';

const CLOUD_METADATA_ENV_KEYS = ['KIMI_API_KEY', 'MISTRAL_API_KEY', 'GEMINI_API_KEY', 'VERTEX_AI_API_KEY'] as const;

describe('LLMFactory reload models', () => {
  const originalHosts = process.env.OLLAMA_HOSTS;
  const originalCloudMetadataEnv = new Map<string, string | undefined>();

  beforeEach(async () => {
    process.env.OLLAMA_HOSTS = 'http://127.0.0.1:11434';
    for (const key of CLOUD_METADATA_ENV_KEYS) {
      originalCloudMetadataEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    mockOllamaList.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(AutobyteusModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    await LLMFactory.reinitialize();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (originalHosts === undefined) {
      delete process.env.OLLAMA_HOSTS;
    } else {
      process.env.OLLAMA_HOSTS = originalHosts;
    }
    for (const key of CLOUD_METADATA_ENV_KEYS) {
      const value = originalCloudMetadataEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await LLMFactory.reinitialize();
  });

  it('reloadModels replaces old models with new ones on success', async () => {
    const initialModel = new LLMModel({
      name: 'old-model',
      value: 'old-model',
      provider: LLMProvider.LMSTUDIO,
      llmClass: LMStudioLLM,
      canonicalName: 'old',
      runtime: LLMRuntime.LMSTUDIO,
      hostUrl: 'http://local'
    });
    LLMFactory.registerModel(initialModel);

    expect((await LLMFactory.listModelsByProvider(LLMProvider.LMSTUDIO)).length).toBe(1);

    const newModel1 = new LLMModel({
      name: 'new-model-1',
      value: 'new-model-1',
      provider: LLMProvider.LMSTUDIO,
      llmClass: LMStudioLLM,
      canonicalName: 'new1',
      runtime: LLMRuntime.LMSTUDIO,
      hostUrl: 'http://local'
    });
    const newModel2 = new LLMModel({
      name: 'new-model-2',
      value: 'new-model-2',
      provider: LLMProvider.LMSTUDIO,
      llmClass: LMStudioLLM,
      canonicalName: 'new2',
      runtime: LLMRuntime.LMSTUDIO,
      hostUrl: 'http://local'
    });

    const fetchSpy = vi
      .spyOn(LMStudioModelProvider, 'getModels')
      .mockResolvedValue([newModel1, newModel2]);

    const count = await LLMFactory.reloadModels(LLMProvider.LMSTUDIO);
    expect(count).toBe(2);
    expect(fetchSpy).toHaveBeenCalledOnce();

    const currentModels = await LLMFactory.listModelsByProvider(LLMProvider.LMSTUDIO);
    const currentIds = currentModels.map((model) => model.model_identifier);
    expect(currentIds).not.toContain('old-model:lmstudio');
    expect(currentIds).toContain(newModel1.modelIdentifier);
    expect(currentIds).toContain(newModel2.modelIdentifier);
  });

  it('reloadModels clears models when fetch fails (fail fast)', async () => {
    const initialModel = new LLMModel({
      name: 'precious-data',
      value: 'precious',
      provider: LLMProvider.OLLAMA,
      llmClass: LMStudioLLM,
      canonicalName: 'precious',
      runtime: LLMRuntime.OLLAMA,
      hostUrl: 'http://local'
    });
    LLMFactory.registerModel(initialModel);

    expect((await LLMFactory.listModelsByProvider(LLMProvider.OLLAMA)).length).toBe(1);

    vi.spyOn(OllamaModelProvider, 'getModels').mockRejectedValue(new Error('Server Down'));

    const count = await LLMFactory.reloadModels(LLMProvider.OLLAMA);
    expect(count).toBe(0);
    expect((await LLMFactory.listModelsByProvider(LLMProvider.OLLAMA)).length).toBe(0);
  });

  it('reloadModels repopulates the requested Ollama bucket for vendor-keyword model names', async () => {
    mockOllamaList.mockResolvedValue({
      models: [{ model: 'qwen3.5:35b-a3b-coding-nvfp4' }],
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ model: 'qwen3.5:35b-a3b-coding-nvfp4', context_length: 32768 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parameters: 'num_ctx 16384',
          model_info: { 'qwen.context_length': 262144 },
        }),
      });

    const count = await LLMFactory.reloadModels(LLMProvider.OLLAMA);

    expect(count).toBe(1);

    const ollamaModels = await LLMFactory.listModelsByProvider(LLMProvider.OLLAMA);
    const ollamaIds = ollamaModels.map((model) => model.model_identifier);
    expect(ollamaIds).toContain('qwen3.5:35b-a3b-coding-nvfp4:ollama@127.0.0.1:11434');
    expect(ollamaModels[0]?.max_context_tokens).toBe(262144);
    expect(ollamaModels[0]?.active_context_tokens).toBe(32768);

    const qwenModels = await LLMFactory.listModelsByProvider(LLMProvider.QWEN);
    const ollamaRuntimeQwenModels = qwenModels.filter((model) => model.runtime === 'ollama');
    expect(ollamaRuntimeQwenModels).toHaveLength(0);
  });

  it('reloadModels leaves unsupported providers unchanged', async () => {
    await LLMFactory.ensureInitialized();
    const openaiCount = (await LLMFactory.listModelsByProvider(LLMProvider.OPENAI)).length;
    expect(openaiCount).toBeGreaterThan(0);

    const count = await LLMFactory.reloadModels(LLMProvider.OPENAI);
    expect(count).toBe(openaiCount);
  });
});
