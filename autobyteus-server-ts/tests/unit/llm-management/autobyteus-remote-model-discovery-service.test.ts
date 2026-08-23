import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import {
  AUTOBYTEUS_MODEL_DISCOVERY_DEADLINE_MS,
  AutobyteusRemoteModelDiscoveryService,
} from '../../../src/llm-management/services/autobyteus-remote-model-discovery-service.js';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => { resolve = onResolve; });
  return { promise, resolve };
};

describe('AutobyteusRemoteModelDiscoveryService', () => {
  const resolveForUse = vi.fn();
  const ports = {
    discoverLlm: vi.fn(),
    discoverAudio: vi.fn(),
    discoverImage: vi.fn(),
  };
  const signalFactory = vi.fn(() => new AbortController().signal);
  const apiKey = SecretValue.fromString('synthetic-autobyteus-key');

  beforeEach(() => {
    vi.clearAllMocks();
    resolveForUse.mockResolvedValue(apiKey);
    ports.discoverLlm.mockResolvedValue([]);
    ports.discoverAudio.mockResolvedValue([]);
    ports.discoverImage.mockResolvedValue([]);
  });

  const createService = (hosts: string[]) => new AutobyteusRemoteModelDiscoveryService(
    () => ({ resolveForUse } as never),
    () => hosts,
    ports as never,
    signalFactory,
  );

  it('returns an empty preparation without credential lookup when hosts are absent', async () => {
    await expect(createService([]).prepare('llm')).resolves.toEqual({
      models: [], successfulUnitCount: 0, failedUnitCount: 0,
    });
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(ports.discoverLlm).not.toHaveBeenCalled();
  });

  it('resolves the exact discovery consumer and only prepares rows', async () => {
    const models = [{ runtime: LLMRuntime.AUTOBYTEUS, revision: 'current' }];
    ports.discoverLlm.mockResolvedValue(models);

    await expect(createService(['https://gateway.example.invalid']).prepare('llm'))
      .resolves.toEqual({ models, successfulUnitCount: 1, failedUnitCount: 0 });
    expect(resolveForUse).toHaveBeenCalledOnce();
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'modelDiscovery', modelKind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    });
    expect(ports.discoverLlm).toHaveBeenCalledWith(
      'https://gateway.example.invalid',
      { apiKey },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('starts valid hosts concurrently with independent 30-second signals and folds in host order', async () => {
    const first = deferred<Array<{ runtime: LLMRuntime; revision: string }>>();
    ports.discoverLlm.mockImplementation((host: string) => host.includes('first')
      ? first.promise
      : Promise.resolve([{ runtime: LLMRuntime.AUTOBYTEUS, revision: 'second' }]));
    const discovery = createService([
      'https://first.example.invalid',
      'invalid',
      'https://second.example.invalid',
    ]).prepare('llm');

    await vi.waitFor(() => expect(ports.discoverLlm).toHaveBeenCalledTimes(2));
    expect(signalFactory).toHaveBeenNthCalledWith(1, AUTOBYTEUS_MODEL_DISCOVERY_DEADLINE_MS);
    expect(signalFactory).toHaveBeenNthCalledWith(2, AUTOBYTEUS_MODEL_DISCOVERY_DEADLINE_MS);
    first.resolve([{ runtime: LLMRuntime.AUTOBYTEUS, revision: 'first' }]);

    await expect(discovery).resolves.toEqual({
      models: [
        { runtime: LLMRuntime.AUTOBYTEUS, revision: 'first' },
        { runtime: LLMRuntime.AUTOBYTEUS, revision: 'second' },
      ],
      successfulUnitCount: 2,
      failedUnitCount: 1,
    });
  });

  it('reports partial host failure and normalizes total failure', async () => {
    ports.discoverImage
      .mockResolvedValueOnce([{ revision: 'current' }])
      .mockRejectedValueOnce(new Error('sensitive remote body'));
    await expect(createService([
      'https://first.example.invalid', 'https://second.example.invalid',
    ]).prepare('image')).resolves.toEqual({
      models: [{ revision: 'current' }], successfulUnitCount: 1, failedUnitCount: 1,
    });

    ports.discoverImage.mockReset().mockRejectedValue(new Error('sensitive remote body'));
    await expect(createService(['https://first.example.invalid']).prepare('image'))
      .rejects.toThrow('AUTOBYTEUS_MODEL_DISCOVERY_UNAVAILABLE');
  });

  it('rejects an all-invalid host set before credential access', async () => {
    await expect(createService(['invalid', 'still-invalid']).prepare('audio'))
      .rejects.toThrow('AUTOBYTEUS_MODEL_DISCOVERY_INVALID_HOSTS');
    expect(resolveForUse).not.toHaveBeenCalled();
  });
});
