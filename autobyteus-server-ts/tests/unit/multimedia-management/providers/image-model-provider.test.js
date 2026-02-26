import { describe, it, expect, vi, afterEach } from "vitest";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import { ImageModelProvider } from "../../../../src/multimedia-management/providers/image-model-provider.js";
describe("ImageModelProvider", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it("returns models from ImageClientFactory", async () => {
        const listSpy = vi
            .spyOn(ImageClientFactory, "listModels")
            .mockReturnValue([{ id: "i1" }]);
        const provider = new ImageModelProvider();
        const models = await provider.listModels();
        expect(models).toEqual([{ id: "i1" }]);
        expect(listSpy).toHaveBeenCalledTimes(1);
    });
    it("returns empty list when ImageClientFactory throws", async () => {
        vi.spyOn(ImageClientFactory, "listModels").mockImplementation(() => {
            throw new Error("boom");
        });
        const provider = new ImageModelProvider();
        const models = await provider.listModels();
        expect(models).toEqual([]);
    });
    it("reinitializes models on refresh", async () => {
        const reinitSpy = vi
            .spyOn(ImageClientFactory, "reinitialize")
            .mockImplementation(() => undefined);
        const provider = new ImageModelProvider();
        await provider.refreshModels();
        expect(reinitSpy).toHaveBeenCalledTimes(1);
    });
    it("propagates refresh errors", async () => {
        vi.spyOn(ImageClientFactory, "reinitialize").mockImplementation(() => {
            throw new Error("fail");
        });
        const provider = new ImageModelProvider();
        await expect(provider.refreshModels()).rejects.toThrow("fail");
    });
});
