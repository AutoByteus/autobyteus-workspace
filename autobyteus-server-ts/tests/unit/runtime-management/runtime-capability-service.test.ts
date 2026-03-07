import { describe, expect, it } from "vitest";
import type { RuntimeCapabilityProvider } from "../../../src/runtime-management/runtime-capability-service.js";
import { RuntimeCapabilityService } from "../../../src/runtime-management/runtime-capability-service.js";

const createProvider = (
  runtimeKind: string,
  enabled: boolean,
  reason: string | null,
): RuntimeCapabilityProvider => ({
  runtimeKind,
  getRuntimeCapability: () => ({
    runtimeKind,
    enabled,
    reason,
  }),
});

describe("RuntimeCapabilityService", () => {
  it("always reports autobyteus as enabled by default", () => {
    const service = new RuntimeCapabilityService();
    const capability = service.getRuntimeCapability("autobyteus");

    expect(capability.enabled).toBe(true);
    expect(capability.reason).toBeNull();
  });

  it("reports provider capability for registered runtime", () => {
    const service = new RuntimeCapabilityService([
      createProvider("codex_app_server", false, "Codex CLI missing"),
    ]);

    const capability = service.getRuntimeCapability("codex_app_server");
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("Codex CLI missing");
  });

  it("returns not configured for unknown runtimes", () => {
    const service = new RuntimeCapabilityService();
    const capability = service.getRuntimeCapability("custom_runtime");

    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("not configured");
  });
});
