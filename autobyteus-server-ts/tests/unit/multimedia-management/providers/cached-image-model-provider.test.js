import { describe, it, expect, vi, beforeEach } from "vitest";
import { CachedImageModelProvider } from "../../../../src/multimedia-management/providers/cached-image-model-provider.js";
describe("CachedImageModelProvider", () => {
    const mockProvider = {
        listModels: vi.fn(),
        refreshModels: vi.fn(),
    };
    beforeEach(() => {
        mockProvider.listModels.mockReset();
        mockProvider.refreshModels.mockReset();
    });
    it("caches listModels results", async () => {
        mockProvider.listModels.mockResolvedValue([{ id: "i1" }]);
        const provider = new CachedImageModelProvider(mockProvider);
        const first = await provider.listModels();
        const second = await provider.listModels();
        expect(first).toEqual([{ id: "i1" }]);
        expect(second).toEqual([{ id: "i1" }]);
        expect(mockProvider.listModels).toHaveBeenCalledTimes(1);
        expect(provider.getCachedCount()).toBe(1);
    });
    it("refreshes cache on refreshModels", async () => {
        mockProvider.listModels.mockResolvedValueOnce([{ id: "i1" }]).mockResolvedValueOnce([
            { id: "i2" },
        ]);
        mockProvider.refreshModels.mockResolvedValue(undefined);
        const provider = new CachedImageModelProvider(mockProvider);
        await provider.listModels();
        await provider.refreshModels();
        const models = await provider.listModels();
        expect(models).toEqual([{ id: "i2" }]);
        expect(mockProvider.refreshModels).toHaveBeenCalledTimes(1);
        expect(mockProvider.listModels).toHaveBeenCalledTimes(2);
    });
});
