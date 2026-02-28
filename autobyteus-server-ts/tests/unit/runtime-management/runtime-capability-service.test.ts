import { afterEach, describe, expect, it } from "vitest";
import { RuntimeCapabilityService } from "../../../src/runtime-management/runtime-capability-service.js";

const ORIGINAL_CODEX_ENV = process.env.CODEX_APP_SERVER_ENABLED;
const ORIGINAL_CLAUDE_ENV = process.env.CLAUDE_AGENT_SDK_ENABLED;

describe("RuntimeCapabilityService", () => {
  afterEach(() => {
    if (ORIGINAL_CODEX_ENV === undefined) {
      delete process.env.CODEX_APP_SERVER_ENABLED;
    } else {
      process.env.CODEX_APP_SERVER_ENABLED = ORIGINAL_CODEX_ENV;
    }

    if (ORIGINAL_CLAUDE_ENV === undefined) {
      delete process.env.CLAUDE_AGENT_SDK_ENABLED;
    } else {
      process.env.CLAUDE_AGENT_SDK_ENABLED = ORIGINAL_CLAUDE_ENV;
    }
  });

  it("always reports autobyteus as enabled", () => {
    const service = new RuntimeCapabilityService([], 0);

    const capability = service.getRuntimeCapability("autobyteus");
    expect(capability.enabled).toBe(true);
    expect(capability.reason).toBeNull();
  });

  it("reports codex disabled when probe fails", () => {
    const service = new RuntimeCapabilityService(
      [
        {
          runtimeKind: "codex_app_server",
          envToggleName: "CODEX_APP_SERVER_ENABLED",
          probe: () => ({ enabled: false, reason: "Codex CLI missing" }),
        },
      ],
      0,
    );

    const capability = service.getRuntimeCapability("codex_app_server");
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("Codex CLI missing");
  });

  it("uses CODEX_APP_SERVER_ENABLED override before probing", () => {
    process.env.CODEX_APP_SERVER_ENABLED = "false";
    const service = new RuntimeCapabilityService(
      [
        {
          runtimeKind: "codex_app_server",
          envToggleName: "CODEX_APP_SERVER_ENABLED",
          probe: () => ({ enabled: true, reason: null }),
        },
      ],
      0,
    );

    const capability = service.getRuntimeCapability("codex_app_server");
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toContain("CODEX_APP_SERVER_ENABLED");
  });

  it("uses CLAUDE_AGENT_SDK_ENABLED override independently", () => {
    process.env.CLAUDE_AGENT_SDK_ENABLED = "true";
    const service = new RuntimeCapabilityService(
      [
        {
          runtimeKind: "claude_agent_sdk",
          envToggleName: "CLAUDE_AGENT_SDK_ENABLED",
          probe: () => ({ enabled: false, reason: "SDK missing" }),
        },
      ],
      0,
    );

    const capability = service.getRuntimeCapability("claude_agent_sdk");
    expect(capability.enabled).toBe(true);
    expect(capability.reason).toBeNull();
  });
});
