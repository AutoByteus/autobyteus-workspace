import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoggingConfig } from "../../../src/config/logging-config.js";
import { createServerLogger, initializeServerAppLogger, __testOnly } from "../../../src/logging/server-app-logger.js";

const baseLoggingConfig: LoggingConfig = {
  pinoLogLevel: "info",
  httpAccessLogMode: "errors",
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
};

describe("server-app-logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    __testOnly.resetServerAppLoggerState();
  });

  it("suppresses debug logs when the effective level is info", () => {
    initializeServerAppLogger(baseLoggingConfig);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    createServerLogger("agent-team-definition.cache").debug("Cache HIT for %s", "team-1");

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("emits debug logs for the most specific scoped override", () => {
    initializeServerAppLogger({
      ...baseLoggingConfig,
      scopedLogLevelOverrides: [{ scope: "agent-team-definition.cache", level: "debug" }],
    });
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    createServerLogger("agent-team-definition.cache").debug("Cache HIT for %s", "team-1");

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy.mock.calls[0]?.[0]).toContain("[DEBUG]");
    expect(debugSpy.mock.calls[0]?.[0]).toContain("[agent-team-definition.cache]");
    expect(debugSpy.mock.calls[0]?.[0]).toContain("Cache HIT for team-1");
  });

  it("builds child logger scopes without caller-side prefixes", () => {
    initializeServerAppLogger({
      ...baseLoggingConfig,
      scopedLogLevelOverrides: [{ scope: "server.runtime.shutdown", level: "info" }],
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    createServerLogger("server.runtime").child("shutdown").info("Server closed cleanly.");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0]?.[0]).toContain("[server.runtime.shutdown]");
    expect(infoSpy.mock.calls[0]?.[0]).toContain("Server closed cleanly.");
  });
});
