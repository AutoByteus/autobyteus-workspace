import { describe, expect, it } from "vitest";
import { getLoggingConfigFromEnv } from "../../../src/config/logging-config.js";

describe("logging-config", () => {
  it("uses defaults when env values are missing", () => {
    const config = getLoggingConfigFromEnv({} as NodeJS.ProcessEnv);
    expect(config).toEqual({
      pinoLogLevel: "info",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
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
    });
  });
});
