import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UpdateAutomationSettingsService,
  UpdateCheckIntervalOutOfRangeError,
} from "../../../src/update-notifications/services/update-automation-settings-service.js";

const harness = (initial: Record<string, string> = {}, gateTimes: { api?: Date | null; web?: Date | null } = {}) => {
  const values = new Map(Object.entries(initial));
  const publish = vi.fn();
  const updateSetting = vi.fn((key: string, value: string): [boolean, string] => { values.set(key, value); return [true, ""]; });
  const service = new UpdateAutomationSettingsService({
    settings: { getSettingValue: (key) => values.get(key) ?? null, updateSetting },
    gate: () => ({ blockedUntil: (family) => gateTimes[family] ?? null }),
    publish,
    isDesktopEmbeddedNode: () => true,
  });
  return { service, values, publish, updateSetting };
};

afterEach(() => { vi.restoreAllMocks(); });

describe("UpdateAutomationSettingsService (REQ-010..016)", () => {
  it("reads the defaults when nothing is stored: 30 / 30 / 60 minutes, all automatic updates off", () => {
    expect(harness().service.read()).toEqual({
      intervals: { AGENT_PACKAGE: 30, SKILL_SOURCE: 30, AGENT_RUNTIME: 60 },
      automaticUpdates: { AGENT_PACKAGE: false, SKILL_SOURCE: false, AGENT_RUNTIME: false },
      githubWaitUntil: null,
      desktopEmbeddedNode: true,
    });
  });

  it("stores an interval of 15..1440 whole minutes and announces the change", () => {
    const h = harness();
    expect(h.service.setInterval("SKILL_SOURCE", 15).intervals.SKILL_SOURCE).toBe(15);
    expect(h.service.setInterval("AGENT_RUNTIME", 1440).intervals.AGENT_RUNTIME).toBe(1440);
    expect(h.values.get("UPDATE_CHECK_INTERVAL_SKILL_SOURCES_MINUTES")).toBe("15");
    expect(h.values.get("UPDATE_CHECK_INTERVAL_AGENT_RUNTIMES_MINUTES")).toBe("1440");
    expect(h.publish).toHaveBeenCalledTimes(2);
  });

  it.each([14, 1441, 0, -30, 30.5, Number.NaN])("refuses %s minutes without storing or announcing", (minutes) => {
    const h = harness();
    expect(() => h.service.setInterval("AGENT_PACKAGE", minutes)).toThrow(UpdateCheckIntervalOutOfRangeError);
    expect(() => h.service.setInterval("AGENT_PACKAGE", minutes)).toThrow("Enter a whole number from 15 minutes to 24 hours.");
    expect(h.updateSetting).not.toHaveBeenCalled();
    expect(h.publish).not.toHaveBeenCalled();
  });

  it("stores the automatic switch per kind and announces it", () => {
    const h = harness();
    expect(h.service.setAutomatic("AGENT_RUNTIME", true).automaticUpdates)
      .toEqual({ AGENT_PACKAGE: false, SKILL_SOURCE: false, AGENT_RUNTIME: true });
    expect(h.values.get("AUTO_UPDATE_AGENT_RUNTIMES")).toBe("true");
    h.service.setAutomatic("AGENT_RUNTIME", false);
    expect(h.values.get("AUTO_UPDATE_AGENT_RUNTIMES")).toBe("false");
    expect(h.service.isAutomatic("AGENT_RUNTIME")).toBe(false);
    expect(h.publish).toHaveBeenCalledTimes(2);
  });

  it("reads an invalid stored value as the default and warns once per value (DESIGN rule 7)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const h = harness({
      UPDATE_CHECK_INTERVAL_AGENT_PACKAGES_MINUTES: "5",
      UPDATE_CHECK_INTERVAL_SKILL_SOURCES_MINUTES: "30min",
      AUTO_UPDATE_SKILL_SOURCES: "yes",
      AUTO_UPDATE_AGENT_PACKAGES: "TRUE",
    });
    for (let i = 0; i < 3; i++) {
      expect(h.service.intervalMinutes("AGENT_PACKAGE")).toBe(30);
      expect(h.service.intervalMinutes("SKILL_SOURCE")).toBe(30);
      expect(h.service.isAutomatic("SKILL_SOURCE")).toBe(false);
      expect(h.service.isAutomatic("AGENT_PACKAGE")).toBe(true);
    }
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith("UPDATE_AUTOMATION_SETTING_INVALID:UPDATE_CHECK_INTERVAL_AGENT_PACKAGES_MINUTES", "5");
  });

  it("reports until when GitHub asked this node to wait: the later of the two families", () => {
    const api = new Date("2026-10-20T10:40:00.000Z");
    const web = new Date("2026-10-20T10:05:00.000Z");
    expect(harness({}, { api, web }).service.read().githubWaitUntil).toEqual(api);
    expect(harness({}, { web }).service.read().githubWaitUntil).toEqual(web);
  });

  it("surfaces a refused store as an error and does not announce", () => {
    const publish = vi.fn();
    const service = new UpdateAutomationSettingsService({
      settings: { getSettingValue: () => null, updateSetting: () => [false, "Settings file is read-only."] },
      gate: () => ({ blockedUntil: () => null }), publish, isDesktopEmbeddedNode: () => false,
    });
    expect(() => service.setAutomatic("AGENT_PACKAGE", true)).toThrow("Settings file is read-only.");
    expect(publish).not.toHaveBeenCalled();
  });
});
