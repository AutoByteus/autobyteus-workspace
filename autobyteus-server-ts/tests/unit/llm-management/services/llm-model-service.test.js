import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
const mockCachedProvider = vi.hoisted(() => ({
    listModels: vi.fn(),
    refreshModels: vi.fn(),
    refreshModelsForProvider: vi.fn(),
}));
vi.mock("../../../../src/llm-management/providers/cached-llm-model-provider.js", () => ({
    CachedLlmModelProvider: class {
        constructor() {
            return mockCachedProvider;
        }
    },
}));
vi.mock("../../../../src/llm-management/providers/llm-model-provider.js", () => ({
    LlmModelProvider: vi.fn(),
}));
import { LlmModelService } from "../../../../src/llm-management/services/llm-model-service.js";
describe("LlmModelService", () => {
    beforeEach(() => {
        mockCachedProvider.listModels.mockReset();
        mockCachedProvider.refreshModels.mockReset();
        mockCachedProvider.refreshModelsForProvider.mockReset();
        LlmModelService.resetInstance();
    });
    it("returns available models", async () => {
        mockCachedProvider.listModels.mockResolvedValue([{ id: "m1" }]);
        const service = LlmModelService.getInstance();
        const models = await service.getAvailableModels();
        expect(models).toEqual([{ id: "m1" }]);
        expect(mockCachedProvider.listModels).toHaveBeenCalledTimes(1);
    });
    it("reloads all models", async () => {
        mockCachedProvider.refreshModels.mockResolvedValue(undefined);
        const service = LlmModelService.getInstance();
        await service.reloadModels();
        expect(mockCachedProvider.refreshModels).toHaveBeenCalledTimes(1);
    });
    it("reloads models for a provider", async () => {
        mockCachedProvider.refreshModelsForProvider.mockResolvedValue(4);
        const service = LlmModelService.getInstance();
        const count = await service.reloadModelsForProvider(LLMProvider.OLLAMA);
        expect(count).toBe(4);
        expect(mockCachedProvider.refreshModelsForProvider).toHaveBeenCalledWith(LLMProvider.OLLAMA);
    });
});
