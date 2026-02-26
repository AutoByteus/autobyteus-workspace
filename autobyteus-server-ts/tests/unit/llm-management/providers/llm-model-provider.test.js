import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
const mockListAvailableModels = vi.fn();
const mockReinitialize = vi.fn();
const mockListModelsByProvider = vi.fn();
const mockReloadModels = vi.fn();
vi.mock("autobyteus-ts", () => ({
    LLMFactory: {
        listAvailableModels: (...args) => mockListAvailableModels(...args),
        reinitialize: (...args) => mockReinitialize(...args),
        listModelsByProvider: (...args) => mockListModelsByProvider(...args),
        reloadModels: (...args) => mockReloadModels(...args),
    },
}));
import { LlmModelProvider } from "../../../../src/llm-management/providers/llm-model-provider.js";
describe("LlmModelProvider", () => {
    beforeEach(() => {
        mockListAvailableModels.mockReset();
        mockReinitialize.mockReset();
        mockListModelsByProvider.mockReset();
        mockReloadModels.mockReset();
    });
    it("returns models from LLMFactory", async () => {
        mockListAvailableModels.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
        const provider = new LlmModelProvider();
        const models = await provider.listModels();
        expect(models).toHaveLength(2);
        expect(mockListAvailableModels).toHaveBeenCalledTimes(1);
    });
    it("returns empty list when LLMFactory throws", async () => {
        mockListAvailableModels.mockRejectedValue(new Error("boom"));
        const provider = new LlmModelProvider();
        const models = await provider.listModels();
        expect(models).toEqual([]);
    });
    it("reinitializes models on refresh", async () => {
        mockReinitialize.mockResolvedValue(undefined);
        const provider = new LlmModelProvider();
        await provider.refreshModels();
        expect(mockReinitialize).toHaveBeenCalledTimes(1);
    });
    it("propagates refresh errors", async () => {
        mockReinitialize.mockRejectedValue(new Error("fail"));
        const provider = new LlmModelProvider();
        await expect(provider.refreshModels()).rejects.toThrow("fail");
    });
    it("returns current models for non-reloadable providers", async () => {
        mockListModelsByProvider.mockResolvedValue([{ id: "m1" }]);
        const provider = new LlmModelProvider();
        const count = await provider.refreshModelsForProvider(LLMProvider.OPENAI);
        expect(count).toBe(1);
        expect(mockListModelsByProvider).toHaveBeenCalledWith(LLMProvider.OPENAI);
        expect(mockReloadModels).not.toHaveBeenCalled();
    });
    it("reloads models for reloadable providers", async () => {
        mockReloadModels.mockResolvedValue(3);
        const provider = new LlmModelProvider();
        const count = await provider.refreshModelsForProvider(LLMProvider.OLLAMA);
        expect(count).toBe(3);
        expect(mockReloadModels).toHaveBeenCalledWith(LLMProvider.OLLAMA);
    });
    it("propagates reload errors", async () => {
        mockReloadModels.mockRejectedValue(new Error("reload failed"));
        const provider = new LlmModelProvider();
        await expect(provider.refreshModelsForProvider(LLMProvider.OLLAMA)).rejects.toThrow("reload failed");
    });
});
