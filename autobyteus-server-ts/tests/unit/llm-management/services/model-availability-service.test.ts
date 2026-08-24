import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts/llm/llm-factory.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
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
      { configuredHosts: vi.fn(() => []) } as never,
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
      { configuredHosts: vi.fn(() => []) } as never,
    );

    await service.ensureModelAvailable('vendor:family:model:ollama@localhost:11434', 'LLM');
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalledWith('OLLAMA', 'autobyteus');
  });

  it('matches multimedia identifiers by the final at-sign and ensures AutoByteus', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const identifier = 'vendor@family@model@gateway.example.invalid:8443';
    vi.spyOn(AudioClientFactory, 'listModels')
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{
        modelIdentifier: identifier,
        runtime: MultimediaRuntime.AUTOBYTEUS,
        hostUrl: 'https://gateway.example.invalid:8443',
      }] as never);
    const service = new ModelAvailabilityService(
      catalog as never,
      { getProviderById: vi.fn() } as never,
      { configuredHosts: vi.fn(() => ['https://gateway.example.invalid:8443']) } as never,
    );

    await service.ensureModelAvailable(
      identifier,
      'AUDIO',
    );
    expect(catalog.ensureProviderModelCatalog).toHaveBeenCalledWith('AUTOBYTEUS', 'autobyteus');
  });

  it('does no catalog work for an already registered model and rejects noncanonical identifiers', async () => {
    const catalog = { ensureProviderModelCatalog: vi.fn().mockResolvedValue(undefined) };
    const customProviders = { getProviderById: vi.fn() };
    const service = new ModelAvailabilityService(
      catalog as never,
      customProviders as never,
      { configuredHosts: vi.fn(() => []) } as never,
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
      { configuredHosts: vi.fn(() => []) } as never,
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
      { configuredHosts: vi.fn(() => []) } as never,
    );

    await expect(service.ensureModelAvailable(identifier, 'LLM'))
      .rejects.toThrow('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(catalog.ensureProviderModelCatalog).not.toHaveBeenCalled();
  });
});
