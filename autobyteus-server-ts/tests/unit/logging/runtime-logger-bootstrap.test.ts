import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LoggingConfig } from "../../../src/config/logging-config.js";
import {
  __testOnly,
  getFastifyLoggerOptions,
  initializeRuntimeLoggerBootstrap,
} from "../../../src/logging/runtime-logger-bootstrap.js";

const waitForFlush = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 30));
};

describe("runtime-logger-bootstrap", () => {
  afterEach(() => {
    __testOnly.resetRuntimeLoggerBootstrap();
  });

  it("writes console and fastify stream logs to the same file sink", async () => {
    const logsDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ab-runtime-log-"));
    const loggingConfig: LoggingConfig = {
      pinoLogLevel: "info",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
      scopedLogLevelOverrides: [],
    };

    const { logFilePath } = initializeRuntimeLoggerBootstrap({ logsDir, loggingConfig });
    console.info("runtime-bootstrap-console-check");

    const fastifyOptions = getFastifyLoggerOptions(loggingConfig);
    if (!fastifyOptions.stream) {
      throw new Error("Expected fastify stream to be initialized.");
    }
    fastifyOptions.stream.write("runtime-bootstrap-fastify-check\n");

    await waitForFlush();
    const content = await fsPromises.readFile(logFilePath, "utf-8");
    expect(content).toContain("runtime-bootstrap-console-check");
    expect(content).toContain("runtime-bootstrap-fastify-check");

    await fsPromises.rm(logsDir, { recursive: true, force: true });
  });

  it("suppresses legacy console debug output when the runtime level is info", async () => {
    const logsDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ab-runtime-log-"));
    const loggingConfig: LoggingConfig = {
      pinoLogLevel: "info",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
      scopedLogLevelOverrides: [],
    };

    const { logFilePath } = initializeRuntimeLoggerBootstrap({ logsDir, loggingConfig });
    console.debug("runtime-bootstrap-debug-should-not-appear");
    console.info("runtime-bootstrap-info-should-appear");

    await waitForFlush();
    const content = await fsPromises.readFile(logFilePath, "utf-8");
    expect(content).not.toContain("runtime-bootstrap-debug-should-not-appear");
    expect(content).toContain("runtime-bootstrap-info-should-appear");

    await fsPromises.rm(logsDir, { recursive: true, force: true });
  });

  it("emits legacy console debug output when the runtime level is debug", async () => {
    const logsDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ab-runtime-log-"));
    const loggingConfig: LoggingConfig = {
      pinoLogLevel: "debug",
      httpAccessLogMode: "errors",
      includeNoisyHttpAccessRoutes: false,
      scopedLogLevelOverrides: [],
    };

    const { logFilePath } = initializeRuntimeLoggerBootstrap({ logsDir, loggingConfig });
    console.debug("runtime-bootstrap-debug-should-appear");

    await waitForFlush();
    const content = await fsPromises.readFile(logFilePath, "utf-8");
    expect(content).toContain("runtime-bootstrap-debug-should-appear");

    await fsPromises.rm(logsDir, { recursive: true, force: true });
  });
});
