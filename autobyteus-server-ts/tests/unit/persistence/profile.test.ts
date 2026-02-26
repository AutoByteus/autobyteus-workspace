import { describe, expect, it } from "vitest";
import {
  getPersistenceProfile,
  isAndroidRuntime,
  normalizePersistenceProfile,
} from "../../../src/persistence/profile.js";

describe("persistence profile", () => {
  it("defaults to sqlite on non-Android runtimes", () => {
    const env: NodeJS.ProcessEnv = {};
    expect(getPersistenceProfile(env, "linux")).toBe("sqlite");
  });

  it("forces file profile when platform is android", () => {
    const env: NodeJS.ProcessEnv = { PERSISTENCE_PROVIDER: "sqlite" };
    expect(getPersistenceProfile(env, "android")).toBe("file");
  });

  it("forces file profile when Android markers are present", () => {
    const env: NodeJS.ProcessEnv = {
      PERSISTENCE_PROVIDER: "postgresql",
      ANDROID_ROOT: "/system",
    };
    expect(getPersistenceProfile(env, "linux")).toBe("file");
  });

  it("keeps file profile when explicitly configured on Android", () => {
    const env: NodeJS.ProcessEnv = { PERSISTENCE_PROVIDER: "file", ANDROID_DATA: "/data" };
    expect(getPersistenceProfile(env, "linux")).toBe("file");
  });

  it("rejects unsupported persistence values", () => {
    expect(() => normalizePersistenceProfile("unsupported")).toThrow(/PERSISTENCE_PROVIDER must be one of/i);
  });

  it("detects Android runtime from platform or Android env markers", () => {
    expect(isAndroidRuntime({}, "android")).toBe(true);
    expect(isAndroidRuntime({ ANDROID_ROOT: "/system" }, "linux")).toBe(true);
    expect(isAndroidRuntime({ ANDROID_DATA: "/data" }, "linux")).toBe(true);
    expect(isAndroidRuntime({}, "linux")).toBe(false);
  });
});
