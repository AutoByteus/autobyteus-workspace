import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { CachedLlmModelProvider } from "../../../../src/llm-management/providers/cached-llm-model-provider.js";
describe("CachedLlmModelProvider", () => {
    const mockProvider = {
        listModels: vi.fn(),
        refreshModels: vi.fn(),
        refreshModelsForProvider: vi.fn(),
    };
    beforeEach(() => {
        mockProvider.listModels.mockReset();
        mockProvider.refreshModels.mockReset();
        mockProvider.refreshModelsForProvider.mockReset();
    });
    it("caches listModels results", async () => {
        mockProvider.listModels.mockResolvedValue([{ id: "m1" }]);
        const provider = new CachedLlmModelProvider(mockProvider);
        const first = await provider.listModels();
        const second = await provider.listModels();
        expect(first).toEqual([{ id: "m1" }]);
        expect(second).toEqual([{ id: "m1" }]);
        expect(mockProvider.listModels).toHaveBeenCalledTimes(1);
    });
    it("refreshes cache on refreshModels", async () => {
        mockProvider.listModels.mockResolvedValueOnce([{ id: "m1" }]).mockResolvedValueOnce([
            { id: "m2" },
        ]);
        mockProvider.refreshModels.mockResolvedValue(undefined);
        const provider = new CachedLlmModelProvider(mockProvider);
        await provider.listModels();
        await provider.refreshModels();
        const models = await provider.listModels();
        expect(models).toEqual([{ id: "m2" }]);
        expect(mockProvider.refreshModels).toHaveBeenCalledTimes(1);
        expect(mockProvider.listModels).toHaveBeenCalledTimes(2);
    });
    it("refreshes cache on refreshModelsForProvider", async () => {
        mockProvider.listModels.mockResolvedValueOnce([{ id: "m1" }]).mockResolvedValueOnce([
            { id: "m2" },
        ]);
        mockProvider.refreshModelsForProvider.mockResolvedValue(2);
        const provider = new CachedLlmModelProvider(mockProvider);
        await provider.listModels();
        const count = await provider.refreshModelsForProvider(LLMProvider.OLLAMA);
        expect(count).toBe(2);
        expect(mockProvider.refreshModelsForProvider).toHaveBeenCalledWith(LLMProvider.OLLAMA);
        expect(mockProvider.listModels).toHaveBeenCalledTimes(2);
    });
});
