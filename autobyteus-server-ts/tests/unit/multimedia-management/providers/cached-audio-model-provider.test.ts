import { describe, it, expect, vi, beforeEach } from "vitest";
import { CachedAudioModelProvider } from "../../../../src/multimedia-management/providers/cached-audio-model-provider.js";

describe("CachedAudioModelProvider", () => {
  const mockProvider = {
    listModels: vi.fn(),
    refreshModels: vi.fn(),
  };

  beforeEach(() => {
    mockProvider.listModels.mockReset();
    mockProvider.refreshModels.mockReset();
  });

  it("caches listModels results", async () => {
    mockProvider.listModels.mockResolvedValue([{ id: "a1" }]);
    const provider = new CachedAudioModelProvider(mockProvider as any);

    const first = await provider.listModels();
    const second = await provider.listModels();

    expect(first).toEqual([{ id: "a1" }]);
    expect(second).toEqual([{ id: "a1" }]);
    expect(mockProvider.listModels).toHaveBeenCalledTimes(1);
    expect(provider.getCachedCount()).toBe(1);
  });

  it("refreshes cache on refreshModels", async () => {
    mockProvider.listModels.mockResolvedValueOnce([{ id: "a1" }]).mockResolvedValueOnce([
      { id: "a2" },
    ]);
    mockProvider.refreshModels.mockResolvedValue(undefined);

    const provider = new CachedAudioModelProvider(mockProvider as any);
    await provider.listModels();
    await provider.refreshModels();

    const models = await provider.listModels();
    expect(models).toEqual([{ id: "a2" }]);
    expect(mockProvider.refreshModels).toHaveBeenCalledTimes(1);
    expect(mockProvider.listModels).toHaveBeenCalledTimes(2);
  });
});
