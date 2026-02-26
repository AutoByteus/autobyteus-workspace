import { describe, it, expect, vi, afterEach } from "vitest";
import { AudioClientFactory } from "autobyteus-ts/multimedia/audio/audio-client-factory.js";
import { AudioModelProvider } from "../../../../src/multimedia-management/providers/audio-model-provider.js";

describe("AudioModelProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns models from AudioClientFactory", async () => {
    const listSpy = vi
      .spyOn(AudioClientFactory, "listModels")
      .mockReturnValue([{ id: "a1" }] as never[]);
    const provider = new AudioModelProvider();
    const models = await provider.listModels();
    expect(models).toEqual([{ id: "a1" }]);
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it("returns empty list when AudioClientFactory throws", async () => {
    vi.spyOn(AudioClientFactory, "listModels").mockImplementation(() => {
      throw new Error("boom");
    });
    const provider = new AudioModelProvider();
    const models = await provider.listModels();
    expect(models).toEqual([]);
  });

  it("reinitializes models on refresh", async () => {
    const reinitSpy = vi
      .spyOn(AudioClientFactory, "reinitialize")
      .mockImplementation(() => undefined);
    const provider = new AudioModelProvider();
    await provider.refreshModels();
    expect(reinitSpy).toHaveBeenCalledTimes(1);
  });

  it("propagates refresh errors", async () => {
    vi.spyOn(AudioClientFactory, "reinitialize").mockImplementation(() => {
      throw new Error("fail");
    });
    const provider = new AudioModelProvider();
    await expect(provider.refreshModels()).rejects.toThrow("fail");
  });
});
