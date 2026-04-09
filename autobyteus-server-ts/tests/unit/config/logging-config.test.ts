import { describe, expect, it } from "vitest";
import {
  getLoggingConfigFromEnv,
  resolveScopedLogLevel,
} from "../../../src/config/logging-config.js";

describe("logging-config", () => {
  it("uses defaults when env values are missing", () => {
    const config = getLoggingConfigFromEnv({} as NodeJS.ProcessEnv);
    expect(config).toEqual({
      pinoLogLevel: "info",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
      scopedLogLevelOverrides: [],
    });
  });

  it("parses valid env values", () => {
    const config = getLoggingConfigFromEnv({
      LOG_LEVEL: "debug",
      AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: "all",
      AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY: "true",
    });

    expect(config).toEqual({
      pinoLogLevel: "debug",
      httpAccessLogMode: "all",
      includeNoisyHttpAccessRoutes: true,
      scopedLogLevelOverrides: [],
    });
  });

  it("falls back to safe defaults for invalid env values", () => {
    const config = getLoggingConfigFromEnv({
      LOG_LEVEL: "verbose",
      AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: "everything",
      AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY: "maybe",
    });

    expect(config).toEqual({
      pinoLogLevel: "info",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
      scopedLogLevelOverrides: [],
    });
  });

  it("parses scoped log level overrides and ignores invalid tokens", () => {
    const config = getLoggingConfigFromEnv({
      LOG_LEVEL: "info",
      AUTOBYTEUS_LOG_LEVEL_OVERRIDES:
        "agent-team-definition.cache=debug,invalid-token,electron.server=warn,broken=verbose",
    });

    expect(config.scopedLogLevelOverrides).toEqual([
      { scope: "agent-team-definition.cache", level: "debug" },
      { scope: "electron.server", level: "warn" },
    ]);
  });

  it("resolves the most specific scoped override", () => {
    const config = getLoggingConfigFromEnv({
      LOG_LEVEL: "info",
      AUTOBYTEUS_LOG_LEVEL_OVERRIDES:
        "agent-team-definition=warn,agent-team-definition.cache=debug,server=error",
    });

    expect(resolveScopedLogLevel(config, "agent-team-definition.cache")).toBe("debug");
    expect(resolveScopedLogLevel(config, "agent-team-definition.cache.populate")).toBe("debug");
    expect(resolveScopedLogLevel(config, "agent-team-definition.refresh")).toBe("warn");
    expect(resolveScopedLogLevel(config, "server.runtime")).toBe("error");
    expect(resolveScopedLogLevel(config, "unknown.scope")).toBe("info");
  });
});
