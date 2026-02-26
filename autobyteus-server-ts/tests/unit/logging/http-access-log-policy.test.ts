import { describe, expect, it, vi } from "vitest";
import { registerHttpAccessLogPolicy, __testOnly } from "../../../src/logging/http-access-log-policy.js";

describe("http-access-log-policy", () => {
  it("marks discovery and health routes as noisy", () => {
    expect(__testOnly.isNoisyHttpAccessRoute("GET", "/rest/node-discovery/peers")).toBe(true);
    expect(__testOnly.isNoisyHttpAccessRoute("POST", "/rest/node-discovery/heartbeat")).toBe(true);
    expect(__testOnly.isNoisyHttpAccessRoute("GET", "/rest/health")).toBe(true);
    expect(__testOnly.isNoisyHttpAccessRoute("GET", "/rest/agents")).toBe(false);
  });

  it("suppresses success logs in errors mode", () => {
    const decision = __testOnly.resolveHttpAccessLogDecision(
      { mode: "errors", includeNoisyRoutes: false },
      "GET",
      "/rest/agents",
      200,
    );
    expect(decision).toEqual({ shouldLog: false, level: null });
  });

  it("suppresses noisy success logs in all mode when includeNoisyRoutes is false", () => {
    const decision = __testOnly.resolveHttpAccessLogDecision(
      { mode: "all", includeNoisyRoutes: false },
      "GET",
      "/rest/health",
      200,
    );
    expect(decision).toEqual({ shouldLog: false, level: null });
  });

  it("emits warn and error levels for 4xx/5xx", () => {
    const warnDecision = __testOnly.resolveHttpAccessLogDecision(
      { mode: "all", includeNoisyRoutes: true },
      "GET",
      "/rest/agents",
      404,
    );
    const errorDecision = __testOnly.resolveHttpAccessLogDecision(
      { mode: "all", includeNoisyRoutes: true },
      "GET",
      "/rest/agents",
      500,
    );

    expect(warnDecision).toEqual({ shouldLog: true, level: "warn" });
    expect(errorDecision).toEqual({ shouldLog: true, level: "error" });
  });

  it("does not register hook when mode is off", () => {
    const addHook = vi.fn();
    registerHttpAccessLogPolicy(
      { addHook } as unknown as Parameters<typeof registerHttpAccessLogPolicy>[0],
      { mode: "off", includeNoisyRoutes: false },
    );
    expect(addHook).not.toHaveBeenCalled();
  });
});
