import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { AutobyteusLlmModelProvider } from '../../../../src/llm-management/providers/autobyteus-llm-model-provider.js';
import { ModelCatalogService } from '../../../../src/llm-management/services/model-catalog-service.js';

const ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'KIMI_API_KEY',
  'MISTRAL_API_KEY',
  'GEMINI_API_KEY',
  'VERTEX_AI_API_KEY'
] as const;

describe('ModelCatalogService', () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }

    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    LLMFactory.resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    LLMFactory.resetForTests();

    for (const key of ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('surfaces current Gemini 3.7 Flash through the Autobyteus runtime catalog path', async () => {
    const syncService = {
      ensureSyncedForCatalogRead: vi.fn().mockResolvedValue(undefined)
    };
    const remoteDiscovery = { ensureDiscovered: vi.fn().mockResolvedValue(0) };
    const provider = new AutobyteusLlmModelProvider(syncService as any, remoteDiscovery as any);
    const autobyteusModelCatalog = {
      listModels: vi.fn(async () => provider.listModels()),
      reloadModels: vi.fn(),
      reloadModelsForProvider: vi.fn()
    };
    const emptyModelCatalog = {
      listModels: vi.fn(async (): Promise<ModelInfo[]> => []),
      reloadModels: vi.fn(),
      reloadModelsForProvider: vi.fn()
    };
    const service = new ModelCatalogService(
      autobyteusModelCatalog as any,
      emptyModelCatalog as any,
      emptyModelCatalog as any,
      {} as any,
      {} as any
    );

    const models = await service.listLlmModels('autobyteus');

    expect(syncService.ensureSyncedForCatalogRead).toHaveBeenCalledTimes(1);
    expect(remoteDiscovery.ensureDiscovered).toHaveBeenCalledWith('llm');
    expect(autobyteusModelCatalog.listModels).toHaveBeenCalledTimes(1);
    expect(models.find((model) => model.model_identifier === 'gemini-3.7-flash')).toMatchObject({
      model_identifier: 'gemini-3.7-flash',
      display_name: 'gemini-3.7-flash',
      value: 'gemini-3.7-flash',
      canonical_name: 'gemini-3.7-flash'
    });
  });
});
