import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
import { AutobyteusRemoteModelDiscoveryService } from '../../../src/llm-management/services/autobyteus-remote-model-discovery-service.js';

describe('AutobyteusRemoteModelDiscoveryService', () => {
  const resolveForUse = vi.fn();
  const ports = {
    discoverLlm: vi.fn(),
    discoverAudio: vi.fn(),
    discoverImage: vi.fn(),
    syncLlm: vi.fn(),
    syncAudio: vi.fn(),
    syncImage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveForUse.mockResolvedValue(SecretValue.fromString('synthetic-autobyteus-key'));
    ports.discoverLlm.mockResolvedValue([{ runtime: LLMRuntime.AUTOBYTEUS }]);
    ports.discoverAudio.mockResolvedValue([{ runtime: MultimediaRuntime.AUTOBYTEUS }]);
    ports.discoverImage.mockResolvedValue([{ runtime: MultimediaRuntime.AUTOBYTEUS }]);
    ports.syncLlm.mockImplementation(async (_runtime, models) => models.length);
    ports.syncAudio.mockImplementation((_runtime, models) => models.length);
    ports.syncImage.mockImplementation((_runtime, models) => models.length);
  });

  const createService = (hosts: string[]) => new AutobyteusRemoteModelDiscoveryService(
    () => ({ resolveForUse } as never),
    () => hosts,
    ports as never,
  );

  it('clears only the requested runtime subset without secret lookup when hosts are absent', async () => {
    const service = createService([]);

    await expect(service.ensureDiscovered('llm')).resolves.toBe(0);
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(ports.syncLlm).toHaveBeenCalledWith(LLMRuntime.AUTOBYTEUS, []);
    expect(ports.syncAudio).not.toHaveBeenCalled();
    expect(ports.syncImage).not.toHaveBeenCalled();
  });

  it('resolves the exact model-kind discovery consumer once and publishes authoritative models', async () => {
    const service = createService(['https://gateway.example.invalid']);

    await expect(service.ensureDiscovered('llm')).resolves.toBe(1);
    await expect(service.ensureDiscovered('llm')).resolves.toBe(1);
    expect(resolveForUse).toHaveBeenCalledTimes(1);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'modelDiscovery', modelKind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    });
    expect(ports.discoverLlm).toHaveBeenCalledWith(
      ['https://gateway.example.invalid'], 'synthetic-autobyteus-key',
    );
    expect(ports.syncLlm).toHaveBeenCalledWith(
      LLMRuntime.AUTOBYTEUS,
      [{ runtime: LLMRuntime.AUTOBYTEUS }],
    );
  });

  it('preserves last-known-good registry state when a configured-host refresh fails', async () => {
    const service = createService(['https://gateway.example.invalid']);
    await service.ensureDiscovered('image');
    ports.discoverImage.mockRejectedValueOnce(new Error('remote body must not escape'));

    await expect(service.refresh('image')).rejects.toThrow('AUTOBYTEUS_IMAGE_DISCOVERY_FAILED');
    expect(ports.syncImage).toHaveBeenCalledTimes(1);
  });

  it('clears every gateway runtime subset after explicit credential removal without lookup', async () => {
    const service = createService(['https://gateway.example.invalid']);

    await service.clearAllWithoutLookup();
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(ports.syncLlm).toHaveBeenCalledWith(LLMRuntime.AUTOBYTEUS, []);
    expect(ports.syncAudio).toHaveBeenCalledWith(MultimediaRuntime.AUTOBYTEUS, []);
    expect(ports.syncImage).toHaveBeenCalledWith(MultimediaRuntime.AUTOBYTEUS, []);
  });
});
