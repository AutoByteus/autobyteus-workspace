import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LMStudioLLM } from '../../../src/llm/api/lmstudio-llm.js';
import { LMStudioModelProvider } from '../../../src/llm/lmstudio-provider.js';
import { OllamaModelProvider } from '../../../src/llm/ollama-provider.js';
import { AutobyteusModelProvider } from '../../../src/llm/autobyteus-provider.js';

describe('LLMFactory reload models', () => {
  beforeEach(async () => {
    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(AutobyteusModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    await LLMFactory.reinitialize();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
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

  it('reloadModels leaves unsupported providers unchanged', async () => {
    await LLMFactory.ensureInitialized();
    const openaiCount = (await LLMFactory.listModelsByProvider(LLMProvider.OPENAI)).length;
    expect(openaiCount).toBeGreaterThan(0);

    const count = await LLMFactory.reloadModels(LLMProvider.OPENAI);
    expect(count).toBe(openaiCount);
  });
});
