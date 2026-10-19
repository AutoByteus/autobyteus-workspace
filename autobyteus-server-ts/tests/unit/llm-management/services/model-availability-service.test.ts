import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts/llm/llm-factory.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { ModelAvailabilityService } from '../../../../src/llm-management/services/model-availability-service.js';

describe('ModelAvailabilityService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ensures the exact custom source parsed from a delimiter-bearing producer identifier', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const identifier = 'openai-compatible:provider_gateway:vendor:family:model';
    const customProviders = {
      getProviderById: vi.fn().mockResolvedValue({ id: 'provider_gateway' }),
    };
    const registered = vi.spyOn(LLMFactory, 'listAvailableModels')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ model_identifier: identifier }] as never);
    const service = new ModelAvailabilityService(
      catalog as never,
      customProviders as never,
    );

    await expect(service.ensureModelAvailable(identifier, 'LLM')).resolves.toBeUndefined();
    expect(customProviders.getProviderById).toHaveBeenCalledWith('provider_gateway');
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalledWith('provider_gateway', 'autobyteus');
    expect(registered).toHaveBeenCalledTimes(2);
  });

  it('matches a host-scoped LLM identifier to its canonical dynamic provider', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(LLMFactory, 'listAvailableModels')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        model_identifier: 'vendor:family:model:ollama@localhost:11434',
        host_url: 'http://localhost:11434',
      }] as never);
    vi.spyOn(OllamaModelProvider, 'getHosts').mockReturnValue(['http://localhost:11434']);
    const service = new ModelAvailabilityService(
      catalog as never,
      { getProviderById: vi.fn() } as never,
    );

    await service.ensureModelAvailable('vendor:family:model:ollama@localhost:11434', 'LLM');
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalledWith('OLLAMA', 'autobyteus');
  });

  it('treats a registered media model as available and an unregistered one as unavailable without catalog work', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const service = new ModelAvailabilityService(catalog as never, { getProviderById: vi.fn() } as never);

    await expect(service.ensureModelAvailable('gpt-4o-mini-tts', 'AUDIO')).resolves.toBeUndefined();
    await expect(service.ensureModelAvailable('not-a-registered-image-model', 'IMAGE'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();
  });

  it('reports saved remote AutoByteus model identifiers as unavailable without catalog work (AC-004)', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const customProviders = { getProviderById: vi.fn() };
    vi.spyOn(LLMFactory, 'listAvailableModels').mockResolvedValue([]);
    const service = new ModelAvailabilityService(catalog as never, customProviders as never);

    await expect(service.ensureModelAvailable('gpt-4o:autobyteus@gateway.example.invalid:8000', 'LLM'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    await expect(service.ensureModelAvailable('imagen@gateway.example.invalid:8000', 'IMAGE'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    await expect(service.ensureModelAvailable('tts@gateway.example.invalid:8000', 'AUDIO'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();
    expect(customProviders.getProviderById).not.toHaveBeenCalled();
  });

  it('does no catalog work for an already registered model and rejects noncanonical identifiers', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const customProviders = { getProviderById: vi.fn() };
    const service = new ModelAvailabilityService(
      catalog as never,
      customProviders as never,
    );
    vi.spyOn(LLMFactory, 'listAvailableModels')
      .mockResolvedValueOnce([{ model_identifier: 'gpt-4.1' }] as never)
      .mockResolvedValueOnce([]);
    await service.ensureModelAvailable('gpt-4.1', 'LLM');
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();

    await expect(service.ensureModelAvailable('model:openai_compatible@provider_gateway', 'LLM'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(customProviders.getProviderById).not.toHaveBeenCalled();
  });

  it('rejects a registered row whose full endpoint no longer matches the configured source', async () => {
    const identifier = 'model:ollama@gateway.example.invalid';
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(OllamaModelProvider, 'getHosts')
      .mockReturnValue(['https://gateway.example.invalid/path-b']);
    vi.spyOn(LLMFactory, 'listAvailableModels').mockResolvedValue([{
      model_identifier: identifier,
      host_url: 'http://gateway.example.invalid/path-a',
    }] as never);
    const service = new ModelAvailabilityService(
      catalog as never,
      { getProviderById: vi.fn() } as never,
    );

    await expect(service.ensureModelAvailable(identifier, 'LLM'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalledWith('OLLAMA', 'autobyteus');
  });

  it('does not map an authority-only persisted identifier when multiple full endpoints match', async () => {
    const identifier = 'model:ollama@gateway.example.invalid';
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(OllamaModelProvider, 'getHosts').mockReturnValue([
      'http://gateway.example.invalid/path-a',
      'https://gateway.example.invalid/path-b',
    ]);
    vi.spyOn(LLMFactory, 'listAvailableModels').mockResolvedValue([]);
    const service = new ModelAvailabilityService(
      catalog as never,
      { getProviderById: vi.fn() } as never,
    );

    await expect(service.ensureModelAvailable(identifier, 'LLM'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();
  });
});
