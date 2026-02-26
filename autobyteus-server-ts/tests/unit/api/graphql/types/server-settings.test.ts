import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({
  get: vi.fn<(key: string) => string>(),
  set: vi.fn<(key: string, value: string) => void>(),
}));

const mockServerSettingsService = vi.hoisted(() => ({
  getAvailableSettings: vi.fn(),
  updateSetting: vi.fn(),
  deleteSetting: vi.fn(),
}));

vi.mock("../../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    get config() {
      return mockConfig;
    },
  },
}));

vi.mock("../../../../../src/services/server-settings-service.js", () => ({
  getServerSettingsService: () => mockServerSettingsService,
}));

import { ServerSettingsResolver } from "../../../../../src/api/graphql/types/server-settings.js";

describe("ServerSettingsResolver search config", () => {
  beforeEach(() => {
    mockConfig.get.mockReset();
    mockConfig.set.mockReset();
    mockServerSettingsService.getAvailableSettings.mockReset();
    mockServerSettingsService.updateSetting.mockReset();
    mockServerSettingsService.deleteSetting.mockReset();
    mockConfig.get.mockImplementation(() => "");
  });

  it("maps available server settings from service", () => {
    mockServerSettingsService.getAvailableSettings.mockReturnValue([
      { key: "AUTOBYTEUS_VNC_SERVER_HOSTS", value: "localhost:6080", description: "desc" },
    ]);

    const resolver = new ServerSettingsResolver();
    const result = resolver.getServerSettings();

    expect(result).toEqual([
      { key: "AUTOBYTEUS_VNC_SERVER_HOSTS", value: "localhost:6080", description: "desc" },
    ]);
  });

  it("forwards updateServerSetting to service", () => {
    mockServerSettingsService.updateSetting.mockReturnValue([true, "updated"]);

    const resolver = new ServerSettingsResolver();
    const result = resolver.updateServerSetting("AUTOBYTEUS_VNC_SERVER_HOSTS", "localhost:6081");

    expect(result).toBe("updated");
    expect(mockServerSettingsService.updateSetting).toHaveBeenCalledWith(
      "AUTOBYTEUS_VNC_SERVER_HOSTS",
      "localhost:6081",
    );
  });

  it("forwards deleteServerSetting to service", () => {
    mockServerSettingsService.deleteSetting.mockReturnValue([true, "deleted"]);

    const resolver = new ServerSettingsResolver();
    const result = resolver.deleteServerSetting("CUSTOM_SETTING");

    expect(result).toBe("deleted");
    expect(mockServerSettingsService.deleteSetting).toHaveBeenCalledWith("CUSTOM_SETTING");
  });

  it("returns normalized getSearchConfig snapshot", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      DEFAULT_SEARCH_PROVIDER: " Google_CSE ",
      SERPER_API_KEY: "",
      SERPAPI_API_KEY: "serp-key",
      GOOGLE_CSE_API_KEY: "g-key",
      GOOGLE_CSE_ID: " my-cse-id ",
      VERTEX_AI_SEARCH_API_KEY: "",
      VERTEX_AI_SEARCH_SERVING_CONFIG: "",
    }[key] ?? ""));

    const resolver = new ServerSettingsResolver();
    const result = resolver.getSearchConfig();

    expect(result).toEqual({
      provider: "google_cse",
      serperApiKeyConfigured: false,
      serpapiApiKeyConfigured: true,
      googleCseApiKeyConfigured: true,
      googleCseId: "my-cse-id",
      vertexAiSearchApiKeyConfigured: false,
      vertexAiSearchServingConfig: null,
    });
  });

  it("rejects unsupported provider", () => {
    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("unknown_provider");

    expect(result).toContain("Unsupported provider");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("requires SERPER_API_KEY for serper when not already configured", () => {
    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("serper");

    expect(result).toContain("SERPER_API_KEY is required");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("accepts serper with already configured key", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      SERPER_API_KEY: "existing-serper-key",
    }[key] ?? ""));

    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("serper");

    expect(result).toContain("updated successfully");
    expect(mockConfig.set).toHaveBeenCalledTimes(1);
    expect(mockConfig.set).toHaveBeenCalledWith("DEFAULT_SEARCH_PROVIDER", "serper");
  });

  it("requires GOOGLE_CSE_ID for google_cse", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      GOOGLE_CSE_API_KEY: "existing-google-key",
      GOOGLE_CSE_ID: "",
    }[key] ?? ""));

    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("google_cse");

    expect(result).toContain("GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID are required");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("saves google_cse provider and fields", () => {
    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("google_cse", null, null, "google-key", "cse-id");

    expect(result).toContain("updated successfully");
    expect(mockConfig.set).toHaveBeenCalledWith("DEFAULT_SEARCH_PROVIDER", "google_cse");
    expect(mockConfig.set).toHaveBeenCalledWith("GOOGLE_CSE_API_KEY", "google-key");
    expect(mockConfig.set).toHaveBeenCalledWith("GOOGLE_CSE_ID", "cse-id");
  });

  it("requires vertex serving config for vertex_ai_search", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      VERTEX_AI_SEARCH_API_KEY: "vertex-key",
      VERTEX_AI_SEARCH_SERVING_CONFIG: "",
    }[key] ?? ""));

    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig("vertex_ai_search");

    expect(result).toContain(
      "VERTEX_AI_SEARCH_API_KEY and VERTEX_AI_SEARCH_SERVING_CONFIG are required",
    );
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("saves vertex_ai_search provider and fields", () => {
    const resolver = new ServerSettingsResolver();
    const result = resolver.setSearchConfig(
      "vertex_ai_search",
      null,
      null,
      null,
      null,
      "vertex-key",
      "projects/p/locations/l/collections/default_collection/engines/e/servingConfigs/default_search",
    );

    expect(result).toContain("updated successfully");
    expect(mockConfig.set).toHaveBeenCalledWith("DEFAULT_SEARCH_PROVIDER", "vertex_ai_search");
    expect(mockConfig.set).toHaveBeenCalledWith("VERTEX_AI_SEARCH_API_KEY", "vertex-key");
    expect(mockConfig.set).toHaveBeenCalledWith(
      "VERTEX_AI_SEARCH_SERVING_CONFIG",
      "projects/p/locations/l/collections/default_collection/engines/e/servingConfigs/default_search",
    );
  });
});
