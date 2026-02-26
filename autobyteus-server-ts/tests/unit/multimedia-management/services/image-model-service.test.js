import { beforeEach, describe, expect, it, vi } from "vitest";
const mockCachedProvider = vi.hoisted(() => ({
    listModels: vi.fn(),
    refreshModels: vi.fn(),
}));
vi.mock("../../../../src/multimedia-management/providers/cached-image-model-provider.js", () => ({
    CachedImageModelProvider: class {
        constructor() {
            return mockCachedProvider;
        }
    },
}));
vi.mock("../../../../src/multimedia-management/providers/image-model-provider.js", () => ({
    ImageModelProvider: vi.fn(),
}));
import { ImageModelService } from "../../../../src/multimedia-management/services/image-model-service.js";
describe("ImageModelService", () => {
    beforeEach(() => {
        mockCachedProvider.listModels.mockReset();
        mockCachedProvider.refreshModels.mockReset();
        ImageModelService.resetInstance();
    });
    it("returns available models", async () => {
        mockCachedProvider.listModels.mockResolvedValue([{ id: "i1" }]);
        const service = ImageModelService.getInstance();
        const models = await service.getAvailableModels();
        expect(models).toEqual([{ id: "i1" }]);
        expect(mockCachedProvider.listModels).toHaveBeenCalledTimes(1);
    });
    it("reloads all models", async () => {
        mockCachedProvider.refreshModels.mockResolvedValue(undefined);
        const service = ImageModelService.getInstance();
        await service.reloadModels();
        expect(mockCachedProvider.refreshModels).toHaveBeenCalledTimes(1);
    });
});
