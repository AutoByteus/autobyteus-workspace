import { beforeEach, describe, expect, it, vi } from "vitest";
const mockConfig = vi.hoisted(() => ({
    getConfigData: vi.fn(),
    set: vi.fn(),
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
        mockConfig.set.mockReset();
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
    it("accepts any setting key", () => {
        const service = new ServerSettingsService();
        expect(service.isValidSetting("anything")).toBe(true);
    });
});
