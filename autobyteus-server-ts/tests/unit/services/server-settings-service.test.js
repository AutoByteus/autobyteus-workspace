import { beforeEach, describe, expect, it, vi } from "vitest";
const mockConfig = vi.hoisted(() => ({
    getConfigData: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
}));
vi.mock("../../../src/config/app-config-provider.js", () => ({
    appConfigProvider: {
        get config() {
            return mockConfig;
        },
    },
}));
import { ServerSettingsService } from "../../../src/services/server-settings-service.js";
describe("ServerSettingsService", () => {
    beforeEach(() => {
        mockConfig.getConfigData.mockReset();
        mockConfig.get.mockReset();
        mockConfig.set.mockReset();
        mockConfig.delete.mockReset();
        mockConfig.get.mockImplementation((key) => mockConfig.getConfigData.mock.results.at(-1)?.value?.[key]);
    });
    it("lists available settings excluding API keys", () => {
        mockConfig.getConfigData.mockReturnValue({
            AUTOBYTEUS_SERVER_HOST: "http://localhost:8000",
            CUSTOM_SETTING: "value",
            OPENAI_API_KEY: "secret",
        });
        const service = new ServerSettingsService();
        const settings = service.getAvailableSettings();
        expect(settings).toHaveLength(2);
        expect(settings.find((item) => item.key === "OPENAI_API_KEY")).toBeUndefined();
        expect(settings.find((item) => item.key === "CUSTOM_SETTING")?.description).toBe("Custom user-defined setting");
        expect(settings.find((item) => item.key === "CUSTOM_SETTING")).toMatchObject({
            isEditable: true,
            isDeletable: true,
        });
        expect(settings.find((item) => item.key === "AUTOBYTEUS_SERVER_HOST")).toMatchObject({
            isEditable: false,
            isDeletable: false,
        });
    });
    it("sorts settings by key", () => {
        mockConfig.getConfigData.mockReturnValue({
            ZETA: "1",
            ALPHA: "2",
        });
        const service = new ServerSettingsService();
        const settings = service.getAvailableSettings();
        expect(settings.map((item) => item.key)).toEqual(["ALPHA", "ZETA"]);
    });
    it("includes predefined settings from effective runtime values even when not persisted in config data", () => {
        mockConfig.getConfigData.mockReturnValue({
            CUSTOM_SETTING: "value",
        });
        mockConfig.get.mockImplementation((key) => ({
            AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:29695",
            CUSTOM_SETTING: "value",
        })[key]);
        const service = new ServerSettingsService();
        const settings = service.getAvailableSettings();
        expect(settings.find((item) => item.key === "AUTOBYTEUS_SERVER_HOST")).toMatchObject({
            value: "http://127.0.0.1:29695",
            isEditable: false,
            isDeletable: false,
        });
    });
    it("updates settings successfully", () => {
        mockConfig.set.mockImplementation(() => undefined);
        const service = new ServerSettingsService();
        const [ok, message] = service.updateSetting("CUSTOM_SETTING", "next");
        expect(ok).toBe(true);
        expect(message).toMatch(/updated successfully/i);
        expect(mockConfig.set).toHaveBeenCalledWith("CUSTOM_SETTING", "next");
    });
    it("returns error when update fails", () => {
        mockConfig.set.mockImplementation(() => {
            throw new Error("boom");
        });
        const service = new ServerSettingsService();
        const [ok, message] = service.updateSetting("CUSTOM_SETTING", "next");
        expect(ok).toBe(false);
        expect(message).toContain("boom");
    });
    it("rejects updating system-managed settings", () => {
        const service = new ServerSettingsService();
        const [ok, message] = service.updateSetting("AUTOBYTEUS_SERVER_HOST", "http://example.com:9000");
        expect(ok).toBe(false);
        expect(message).toContain("cannot be updated");
        expect(mockConfig.set).not.toHaveBeenCalled();
    });
    it("accepts any setting key", () => {
        const service = new ServerSettingsService();
        expect(service.isValidSetting("anything")).toBe(true);
    });
    it("deletes custom settings successfully", () => {
        mockConfig.getConfigData.mockReturnValue({
            CUSTOM_SETTING: "value",
        });
        mockConfig.delete.mockImplementation(() => undefined);
        const service = new ServerSettingsService();
        const [ok, message] = service.deleteSetting("CUSTOM_SETTING");
        expect(ok).toBe(true);
        expect(message).toMatch(/deleted successfully/i);
        expect(mockConfig.delete).toHaveBeenCalledWith("CUSTOM_SETTING");
    });
    it("rejects deleting predefined settings", () => {
        mockConfig.getConfigData.mockReturnValue({
            AUTOBYTEUS_SERVER_HOST: "http://localhost:8000",
        });
        const service = new ServerSettingsService();
        const [ok, message] = service.deleteSetting("AUTOBYTEUS_SERVER_HOST");
        expect(ok).toBe(false);
        expect(message).toContain("cannot be removed");
        expect(mockConfig.delete).not.toHaveBeenCalled();
    });
    it("returns error when deleting missing settings", () => {
        mockConfig.getConfigData.mockReturnValue({});
        const service = new ServerSettingsService();
        const [ok, message] = service.deleteSetting("MISSING_SETTING");
        expect(ok).toBe(false);
        expect(message).toContain("does not exist");
        expect(mockConfig.delete).not.toHaveBeenCalled();
    });
});
