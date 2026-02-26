import { afterEach, describe, expect, it } from "vitest";
import { RuntimeCapabilityService } from "../../../src/runtime-management/runtime-capability-service.js";

const ORIGINAL_ENV = process.env.CODEX_APP_SERVER_ENABLED;

describe("RuntimeCapabilityService", () => {
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.CODEX_APP_SERVER_ENABLED;
    } else {
      process.env.CODEX_APP_SERVER_ENABLED = ORIGINAL_ENV;
    }
  });

  it("always reports autobyteus as enabled", () => {
    const service = new RuntimeCapabilityService(
      () => ({ enabled: false, reason: "not used" }),
      0,
    );

    const capability = service.getRuntimeCapability("autobyteus");
    expect(capability.enabled).toBe(true);
    expect(capability.reason).toBeNull();
  });

  it("reports codex disabled when probe fails", () => {
    const service = new RuntimeCapabilityService(
      () => ({ enabled: false, reason: "Codex CLI missing" }),
      0,
    );

    const capability = service.getRuntimeCapability("codex_app_server");
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("Codex CLI missing");
  });

  it("uses CODEX_APP_SERVER_ENABLED override before probing", () => {
    process.env.CODEX_APP_SERVER_ENABLED = "false";
    const service = new RuntimeCapabilityService(
      () => ({ enabled: true, reason: null }),
      0,
    );

    const capability = service.getRuntimeCapability("codex_app_server");
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("CODEX_APP_SERVER_ENABLED");
  });
});
