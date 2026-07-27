import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
import { AutobyteusRemoteModelDiscoveryService } from '../../../src/llm-management/services/autobyteus-remote-model-discovery-service.js';

describe('AutobyteusRemoteModelDiscoveryService', () => {
  const createDeferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => { resolve = complete; });
    return { promise, resolve };
  };

  const resolveForUse = vi.fn();
  const ports = {
    discoverLlm: vi.fn(),
    discoverAudio: vi.fn(),
    discoverImage: vi.fn(),
    syncLlm: vi.fn(),
    syncAudio: vi.fn(),
    syncImage: vi.fn(),
  };
  let resolvedApiKey: SecretValue;

  beforeEach(() => {
    vi.clearAllMocks();
    resolvedApiKey = SecretValue.fromString('synthetic-autobyteus-key');
    resolveForUse.mockResolvedValue(resolvedApiKey);
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
      ['https://gateway.example.invalid'], { apiKey: resolvedApiKey },
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

  it('does not reuse or publish an in-flight discovery for a replaced host configuration', async () => {
    const firstModels = createDeferred<Array<{ runtime: LLMRuntime }>>();
    const secondModels = createDeferred<Array<{ runtime: LLMRuntime }>>();
    let hosts = ['https://first.example.invalid'];
    ports.discoverLlm
      .mockReturnValueOnce(firstModels.promise)
      .mockReturnValueOnce(secondModels.promise);
    const service = new AutobyteusRemoteModelDiscoveryService(
      () => ({ resolveForUse } as never),
      () => hosts,
      ports as never,
    );

    const firstDiscovery = service.ensureDiscovered('llm');
    await vi.waitFor(() => expect(ports.discoverLlm).toHaveBeenCalledTimes(1));
    hosts = ['https://second.example.invalid'];
    const secondDiscovery = service.ensureDiscovered('llm');
    await vi.waitFor(() => expect(ports.discoverLlm).toHaveBeenCalledTimes(2));

    secondModels.resolve([{ runtime: LLMRuntime.AUTOBYTEUS }]);
    await expect(secondDiscovery).resolves.toBe(1);
    firstModels.resolve([{ runtime: LLMRuntime.AUTOBYTEUS }]);
    await expect(firstDiscovery).resolves.toBe(1);

    expect(ports.discoverLlm.mock.calls.map(([configuredHosts]) => configuredHosts)).toEqual([
      ['https://first.example.invalid'],
      ['https://second.example.invalid'],
    ]);
    expect(ports.syncLlm).toHaveBeenCalledTimes(1);
  });

  it('resolves and publishes only the new credential generation after replacement', async () => {
    const oldApiKey = SecretValue.fromString('synthetic-old-autobyteus-key');
    const newApiKey = SecretValue.fromString('synthetic-new-autobyteus-key');
    const oldModels = createDeferred<Array<{ runtime: LLMRuntime; revision: string }>>();
    const newModels = createDeferred<Array<{ runtime: LLMRuntime; revision: string }>>();
    resolveForUse.mockReset()
      .mockResolvedValueOnce(oldApiKey)
      .mockResolvedValueOnce(newApiKey);
    ports.discoverLlm.mockImplementation((_hosts, authentication) =>
      authentication.apiKey === oldApiKey ? oldModels.promise : newModels.promise);
    const service = createService(['https://gateway.example.invalid']);

    const preReplacementDiscovery = service.ensureDiscovered('llm');
    await vi.waitFor(() => expect(ports.discoverLlm).toHaveBeenCalledTimes(1));

    service.invalidateAfterCredentialReplacement();
    const postReplacementRefresh = service.refresh('llm');
    await vi.waitFor(() => expect(ports.discoverLlm).toHaveBeenCalledTimes(2));

    oldModels.resolve([{ runtime: LLMRuntime.AUTOBYTEUS, revision: 'old' }]);
    await expect(preReplacementDiscovery).resolves.toBe(0);
    expect(ports.syncLlm).not.toHaveBeenCalled();

    const authoritativeModels = [{ runtime: LLMRuntime.AUTOBYTEUS, revision: 'new' }];
    newModels.resolve(authoritativeModels);
    await expect(postReplacementRefresh).resolves.toBe(1);
    await expect(service.ensureDiscovered('llm')).resolves.toBe(1);

    expect(resolveForUse).toHaveBeenCalledTimes(2);
    expect(ports.discoverLlm.mock.calls.map(([, authentication]) => authentication)).toEqual([
      { apiKey: oldApiKey },
      { apiKey: newApiKey },
    ]);
    expect(ports.syncLlm).toHaveBeenCalledTimes(1);
    expect(ports.syncLlm).toHaveBeenCalledWith(LLMRuntime.AUTOBYTEUS, authoritativeModels);
  });
});
