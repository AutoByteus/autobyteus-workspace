import { beforeEach, describe, expect, it, vi } from "vitest";
const mockCachedProvider = vi.hoisted(() => ({
    listModels: vi.fn(),
    refreshModels: vi.fn(),
}));
vi.mock("../../../../src/multimedia-management/providers/cached-audio-model-provider.js", () => ({
    CachedAudioModelProvider: class {
        constructor() {
            return mockCachedProvider;
        }
    },
}));
vi.mock("../../../../src/multimedia-management/providers/audio-model-provider.js", () => ({
    AudioModelProvider: vi.fn(),
}));
import { AudioModelService } from "../../../../src/multimedia-management/services/audio-model-service.js";
describe("AudioModelService", () => {
    beforeEach(() => {
        mockCachedProvider.listModels.mockReset();
        mockCachedProvider.refreshModels.mockReset();
        AudioModelService.resetInstance();
    });
    it("returns available models", async () => {
        mockCachedProvider.listModels.mockResolvedValue([{ id: "a1" }]);
        const service = AudioModelService.getInstance();
        const models = await service.getAvailableModels();
        expect(models).toEqual([{ id: "a1" }]);
        expect(mockCachedProvider.listModels).toHaveBeenCalledTimes(1);
    });
    it("reloads all models", async () => {
        mockCachedProvider.refreshModels.mockResolvedValue(undefined);
        const service = AudioModelService.getInstance();
        await service.reloadModels();
        expect(mockCachedProvider.refreshModels).toHaveBeenCalledTimes(1);
    });
});
