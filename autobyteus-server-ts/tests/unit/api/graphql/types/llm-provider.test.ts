import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({
  get: vi.fn<(key: string) => string>(),
  set: vi.fn<(key: string, value: string) => void>(),
  getLlmApiKey: vi.fn<(provider: string) => string | null>(),
  setLlmApiKey: vi.fn<(provider: string, apiKey: string) => void>(),
}));

const mockLlmModelService = vi.hoisted(() => ({
  getAvailableModels: vi.fn(),
  reloadModels: vi.fn(),
  reloadModelsForProvider: vi.fn(),
}));

const mockAudioModelService = vi.hoisted(() => ({
  getAvailableModels: vi.fn(),
  reloadModels: vi.fn(),
}));

const mockImageModelService = vi.hoisted(() => ({
  getAvailableModels: vi.fn(),
  reloadModels: vi.fn(),
}));

vi.mock("../../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    get config() {
      return mockConfig;
    },
  },
}));

vi.mock("../../../../../src/llm-management/services/llm-model-service.js", () => ({
  getLlmModelService: () => mockLlmModelService,
}));

vi.mock("../../../../../src/multimedia-management/services/audio-model-service.js", () => ({
  getAudioModelService: () => mockAudioModelService,
}));

vi.mock("../../../../../src/multimedia-management/services/image-model-service.js", () => ({
  getImageModelService: () => mockImageModelService,
}));

import { LlmProviderResolver } from "../../../../../src/api/graphql/types/llm-provider.js";

describe("LlmProviderResolver Gemini setup", () => {
  beforeEach(() => {
    mockConfig.get.mockReset();
    mockConfig.set.mockReset();
    mockConfig.getLlmApiKey.mockReset();
    mockConfig.setLlmApiKey.mockReset();
    mockConfig.get.mockImplementation(() => "");
  });

  it("infers AI_STUDIO when only Gemini API key is present", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      GEMINI_API_KEY: "gemini-key",
      VERTEX_AI_API_KEY: "",
      VERTEX_AI_PROJECT: "",
      VERTEX_AI_LOCATION: "",
    }[key] ?? ""));

    const resolver = new LlmProviderResolver();
    const setup = resolver.getGeminiSetupConfig();

    expect(setup.mode).toBe("AI_STUDIO");
    expect(setup.geminiApiKeyConfigured).toBe(true);
    expect(setup.vertexApiKeyConfigured).toBe(false);
    expect(setup.vertexProject).toBeNull();
    expect(setup.vertexLocation).toBeNull();
  });

  it("infers VERTEX_EXPRESS when Vertex API key exists", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      GEMINI_API_KEY: "",
      VERTEX_AI_API_KEY: "vertex-key",
      VERTEX_AI_PROJECT: "project-id",
      VERTEX_AI_LOCATION: "us-central1",
    }[key] ?? ""));

    const resolver = new LlmProviderResolver();
    const setup = resolver.getGeminiSetupConfig();

    expect(setup.mode).toBe("VERTEX_EXPRESS");
    expect(setup.vertexApiKeyConfigured).toBe(true);
  });

  it("saves AI_STUDIO mode and clears non-selected Gemini fields", () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig("AI_STUDIO", "gemini-new-key", null, null, null);

    expect(result).toContain("saved successfully");
    expect(mockConfig.set).toHaveBeenCalledWith("GEMINI_API_KEY", "gemini-new-key");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_API_KEY", "");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_PROJECT", "");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_LOCATION", "");
  });

  it("saves VERTEX_EXPRESS mode and clears non-selected Gemini fields", () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig("VERTEX_EXPRESS", null, "vertex-express-key", null, null);

    expect(result).toContain("saved successfully");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_API_KEY", "vertex-express-key");
    expect(mockConfig.set).toHaveBeenCalledWith("GEMINI_API_KEY", "");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_PROJECT", "");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_LOCATION", "");
  });

  it("saves VERTEX_PROJECT mode and clears non-selected Gemini fields", () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig(
      "VERTEX_PROJECT",
      null,
      null,
      "project-id",
      "asia-southeast1",
    );

    expect(result).toContain("saved successfully");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_PROJECT", "project-id");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_LOCATION", "asia-southeast1");
    expect(mockConfig.set).toHaveBeenCalledWith("GEMINI_API_KEY", "");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_API_KEY", "");
  });

  it("returns an error for invalid Gemini setup mode", () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig("UNKNOWN_MODE", null, null, null, null);

    expect(result).toContain("Error saving Gemini setup");
    expect(result).toContain("Invalid Gemini setup mode");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("returns an error when required fields for selected mode are missing", () => {
    const resolver = new LlmProviderResolver();
    const result = resolver.setGeminiSetupConfig("VERTEX_PROJECT", null, null, "project-only", null);

    expect(result).toContain("Error saving Gemini setup");
    expect(result).toContain("Both VERTEX_AI_PROJECT and VERTEX_AI_LOCATION are required");
  });
});
