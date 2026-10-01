import { describe, expect, it, vi } from "vitest";
import { ProjectsCapabilityService } from "../../../src/projects/services/projects-capability-service.js";

const createHarness = (persisted: boolean | null) => {
  let value = persisted;
  const serverSettingsService = {
    getBooleanSetting: vi.fn((key: string) => {
      expect(key).toBe("ENABLE_PROJECTS");
      return value;
    }),
    setBooleanSetting: vi.fn((key: string, enabled: boolean) => {
      expect(key).toBe("ENABLE_PROJECTS");
      value = enabled;
    }),
  };
  return {
    service: new ProjectsCapabilityService({ serverSettingsService }),
    serverSettingsService,
    getPersisted: () => value,
  };
};

describe("ProjectsCapabilityService", () => {
  it("initializes an unset setting as disabled and persists false", async () => {
    const harness = createHarness(null);

    await expect(harness.service.getCapability()).resolves.toEqual({
      enabled: false,
      settingKey: "ENABLE_PROJECTS",
      source: "INITIALIZED_DISABLED",
    });
    expect(harness.getPersisted()).toBe(false);
    await expect(harness.service.getCapability()).resolves.toMatchObject({ source: "SERVER_SETTING" });
  });

  it("returns the persisted setting", async () => {
    const harness = createHarness(true);

    await expect(harness.service.getCapability()).resolves.toEqual({
      enabled: true,
      settingKey: "ENABLE_PROJECTS",
      source: "SERVER_SETTING",
    });
    expect(harness.serverSettingsService.setBooleanSetting).not.toHaveBeenCalled();
  });

  it("persists enable and disable", async () => {
    const harness = createHarness(false);

    await expect(harness.service.setEnabled(true)).resolves.toMatchObject({ enabled: true, source: "SERVER_SETTING" });
    expect(harness.getPersisted()).toBe(true);
    await expect(harness.service.setEnabled(false)).resolves.toMatchObject({ enabled: false });
    expect(harness.getPersisted()).toBe(false);
  });
});
