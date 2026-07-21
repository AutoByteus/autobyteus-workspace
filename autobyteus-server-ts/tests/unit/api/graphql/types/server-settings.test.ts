import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockServerSettingsService = vi.hoisted(() => ({
  getAvailableSettings: vi.fn(),
  updateSetting: vi.fn(),
  deleteSetting: vi.fn(),
}));

const mockSearchProvisioningService = vi.hoisted(() => ({
  getConfigurationStatus: vi.fn(),
  saveConfiguration: vi.fn(),
}));

vi.mock("../../../../../src/services/server-settings-service.js", () => ({
  getServerSettingsService: () => mockServerSettingsService,
}));

vi.mock("../../../../../src/agent-tools/search/search-provisioning-service.js", () => ({
  getSearchProvisioningService: () => mockSearchProvisioningService,
}));

import { ServerSettingsResolver } from "../../../../../src/api/graphql/types/server-settings.js";

describe("ServerSettingsResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchProvisioningService.saveConfiguration.mockResolvedValue(undefined);
  });

  it("maps available server settings from service", () => {
    mockServerSettingsService.getAvailableSettings.mockReturnValue([{
      key: "AUTOBYTEUS_VNC_SERVER_HOSTS",
      value: "localhost:6080",
      description: "desc",
      isEditable: true,
      isDeletable: false,
    }]);
    expect(new ServerSettingsResolver().getServerSettings()).toEqual([{
      key: "AUTOBYTEUS_VNC_SERVER_HOSTS",
      value: "localhost:6080",
      description: "desc",
      isEditable: true,
      isDeletable: false,
    }]);
  });

  it("forwards updateServerSetting to service", () => {
    mockServerSettingsService.updateSetting.mockReturnValue([true, "updated"]);
    expect(new ServerSettingsResolver().updateServerSetting("SETTING", "value")).toBe("updated");
    expect(mockServerSettingsService.updateSetting).toHaveBeenCalledWith("SETTING", "value");
  });

  it("forwards deleteServerSetting to service", () => {
    mockServerSettingsService.deleteSetting.mockReturnValue([true, "deleted"]);
    expect(new ServerSettingsResolver().deleteServerSetting("CUSTOM_SETTING")).toBe("deleted");
    expect(mockServerSettingsService.deleteSetting).toHaveBeenCalledWith("CUSTOM_SETTING");
  });

  it("returns the rich, value-free search configuration status", async () => {
    const status = {
      provider: "serpapi",
      backendHealth: "READY",
      lifecycle: "WRITABLE",
      instructionCode: null,
      serperStorageState: "MISSING",
      serpapiStorageState: "CONFIGURED",
      vertexAiSearchStorageState: "MISSING",
      vertexAiSearchServingConfig: null,
    };
    mockSearchProvisioningService.getConfigurationStatus.mockResolvedValue(status);
    await expect(new ServerSettingsResolver().getSearchConfig()).resolves.toEqual(status);
  });

  it("rejects removed or unsupported search providers without provisioning", async () => {
    await expect(new ServerSettingsResolver().setSearchConfig("google_cse"))
      .resolves.toBe("Error updating search configuration: SEARCH_PROVIDER_UNSUPPORTED");
    expect(mockSearchProvisioningService.saveConfiguration).not.toHaveBeenCalled();
  });

  it("forwards only the selected provider credential and serving configuration", async () => {
    await expect(new ServerSettingsResolver().setSearchConfig(
      " vertex_ai_search ", null, null, "synthetic-test-key", " serving/config ",
    )).resolves.toBe("Search configuration updated successfully.");
    expect(mockSearchProvisioningService.saveConfiguration).toHaveBeenCalledWith({
      provider: "vertex_ai_search",
      apiKey: "synthetic-test-key",
      vertexServingConfig: "serving/config",
    });
  });

  it("returns a value-free stable rejection when provisioning fails", async () => {
    mockSearchProvisioningService.saveConfiguration.mockRejectedValue(new Error("sensitive provider detail"));
    await expect(new ServerSettingsResolver().setSearchConfig("serper", "synthetic-test-key"))
      .resolves.toBe("Error updating search configuration: SEARCH_CONFIGURATION_REJECTED");
  });
});
