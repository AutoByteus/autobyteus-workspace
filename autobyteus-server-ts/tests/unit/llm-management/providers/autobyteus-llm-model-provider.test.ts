import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { AutobyteusLlmModelProvider } from '../../../../src/llm-management/providers/autobyteus-llm-model-provider.js';

describe('AutobyteusLlmModelProvider targeted reload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the current static Anthropic count without dynamic discovery reload', async () => {
    const listModelsByProvider = vi.spyOn(LLMFactory, 'listModelsByProvider').mockResolvedValue([
      { model_identifier: 'claude-fable-5' },
      { model_identifier: 'claude-opus-4.8' },
      { model_identifier: 'claude-opus-4.7' },
      { model_identifier: 'claude-sonnet-5' },
      { model_identifier: 'claude-sonnet-4.6' },
    ] as any);
    const reloadModels = vi.spyOn(LLMFactory, 'reloadModels').mockResolvedValue(0);
    const customSyncService = {
      ensureSyncedForCatalogRead: vi.fn(),
      syncSavedProviders: vi.fn(),
    };
    const remoteDiscovery = { refresh: vi.fn(), ensureDiscovered: vi.fn() };
    const provider = new AutobyteusLlmModelProvider(customSyncService as any, remoteDiscovery as any);

    const count = await provider.refreshModelsForProvider(LLMProvider.ANTHROPIC);

    expect(count).toBe(5);
    expect(listModelsByProvider).toHaveBeenCalledWith(LLMProvider.ANTHROPIC);
    expect(reloadModels).not.toHaveBeenCalled();
    expect(customSyncService.syncSavedProviders).not.toHaveBeenCalled();
    expect(remoteDiscovery.refresh).not.toHaveBeenCalled();
  });

  it('routes targeted AutoByteus reload through managed remote discovery', async () => {
    const customSyncService = { ensureSyncedForCatalogRead: vi.fn(), syncSavedProviders: vi.fn() };
    const remoteDiscovery = { refresh: vi.fn().mockResolvedValue(3), ensureDiscovered: vi.fn() };
    const provider = new AutobyteusLlmModelProvider(customSyncService as any, remoteDiscovery as any);

    await expect(provider.refreshModelsForProvider(LLMProvider.AUTOBYTEUS)).resolves.toBe(3);
    expect(remoteDiscovery.refresh).toHaveBeenCalledWith('llm');
  });
});
