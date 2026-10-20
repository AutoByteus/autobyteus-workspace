import { describe, expect, it } from "vitest";
import { UpdateChecksCapabilityService } from "../../../src/update-notifications/services/update-checks-capability-service.js";

const settingsStub = () => {
  const values = new Map<string, boolean>();
  return {
    values,
    getBooleanSetting: (key: string) => values.get(key) ?? null,
    setBooleanSetting: (key: string, enabled: boolean) => { values.set(key, enabled); },
  };
};

describe("UpdateChecksCapabilityService (REQ-013)", () => {
  it("is on by default without writing the setting", () => {
    const settings = settingsStub();
    const service = new UpdateChecksCapabilityService({ serverSettingsService: settings });
    expect(service.getCapability()).toEqual({ enabled: true, settingKey: "ENABLE_UPDATE_CHECKS", source: "DEFAULT_ENABLED" });
    expect(settings.values.size).toBe(0);
  });

  it("stores the switch and reads it back", () => {
    const settings = settingsStub();
    const service = new UpdateChecksCapabilityService({ serverSettingsService: settings });
    expect(service.setEnabled(false)).toEqual({ enabled: false, settingKey: "ENABLE_UPDATE_CHECKS", source: "SERVER_SETTING" });
    expect(service.isEnabled()).toBe(false);
    service.setEnabled(true);
    expect(service.getCapability()).toEqual({ enabled: true, settingKey: "ENABLE_UPDATE_CHECKS", source: "SERVER_SETTING" });
  });
});
