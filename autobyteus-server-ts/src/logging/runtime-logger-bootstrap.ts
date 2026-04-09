import { Console } from "node:console";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import { shouldEmitLog, type LoggingConfig, type PinoLogLevel } from "../config/logging-config.js";

const originalConsole = globalThis.console;
const SERVER_LOG_FILE_NAME = "server.log";

type RuntimeLoggerBootstrapInput = {
  logsDir: string;
  loggingConfig: LoggingConfig;
};

type RuntimeLoggerBootstrapState = {
  initialized: boolean;
  loggingConfig: LoggingConfig | null;
  logFilePath: string | null;
  fileDescriptor: number | null;
  rawConsole: Console | null;
  stdoutFanoutStream: FanoutWritable | null;
  stderrFanoutStream: FanoutWritable | null;
};

class FanoutWritable extends Writable {
  constructor(
    private readonly consoleStream: NodeJS.WriteStream,
    private readonly fileDescriptor: number,
  ) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      this.consoleStream.write(chunk, encoding);
      if (typeof chunk === "string") {
        fs.writeSync(this.fileDescriptor, chunk, undefined, encoding);
      } else {
        fs.writeSync(this.fileDescriptor, chunk);
      }
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

let runtimeState: RuntimeLoggerBootstrapState = {
  initialized: false,
  loggingConfig: null,
  logFilePath: null,
  fileDescriptor: null,
  rawConsole: null,
  stdoutFanoutStream: null,
  stderrFanoutStream: null,
};

const resetRuntimeState = (): void => {
  if (runtimeState.fileDescriptor !== null) {
    try {
      fs.closeSync(runtimeState.fileDescriptor);
    } catch {
      // Ignore close errors in teardown.
    }
  }
  globalThis.console = originalConsole;
  runtimeState = {
    initialized: false,
    loggingConfig: null,
    logFilePath: null,
    fileDescriptor: null,
    rawConsole: null,
    stdoutFanoutStream: null,
    stderrFanoutStream: null,
  };
};

const getConsoleMethodNameForLevel = (
  level: PinoLogLevel,
): "debug" | "info" | "warn" | "error" => {
  switch (level) {
    case "trace":
    case "debug":
      return "debug";
    case "warn":
      return "warn";
    case "error":
    case "fatal":
      return "error";
    case "info":
    case "silent":
    default:
      return "info";
  }
};

const writeToRuntimeConsole = (level: PinoLogLevel, args: unknown[]): void => {
  const consoleTarget = runtimeState.rawConsole ?? originalConsole;
  const methodName = getConsoleMethodNameForLevel(level);
  Reflect.apply(consoleTarget[methodName], consoleTarget, args);
};

const writeLegacyConsoleRecord = (level: PinoLogLevel, args: unknown[]): void => {
  const loggingConfig = runtimeState.loggingConfig;
  if (loggingConfig && !shouldEmitLog(loggingConfig.pinoLogLevel, level)) {
    return;
  }
  writeToRuntimeConsole(level, args);
};

const createFilteredConsole = (rawConsole: Console): Console => {
  const filteredConsole = Object.create(rawConsole) as Console;
  filteredConsole.debug = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("debug", args);
  };
  filteredConsole.info = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("info", args);
  };
  filteredConsole.log = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("info", args);
  };
  filteredConsole.warn = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("warn", args);
  };
  filteredConsole.error = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("error", args);
  };
  filteredConsole.trace = (...args: unknown[]): void => {
    writeLegacyConsoleRecord("trace", args);
  };
  return filteredConsole;
};

export const initializeRuntimeLoggerBootstrap = (
  input: RuntimeLoggerBootstrapInput,
): { logFilePath: string } => {
  if (runtimeState.initialized) {
    runtimeState.loggingConfig = input.loggingConfig;
    return { logFilePath: runtimeState.logFilePath ?? path.join(input.logsDir, SERVER_LOG_FILE_NAME) };
  }

  fs.mkdirSync(input.logsDir, { recursive: true });
  const logFilePath = path.resolve(input.logsDir, SERVER_LOG_FILE_NAME);
  const fileDescriptor = fs.openSync(logFilePath, "a");

  const stdoutFanoutStream = new FanoutWritable(process.stdout, fileDescriptor);
  const stderrFanoutStream = new FanoutWritable(process.stderr, fileDescriptor);
  const rawConsole = new Console({
    stdout: stdoutFanoutStream,
    stderr: stderrFanoutStream,
    ignoreErrors: false,
  });

  globalThis.console = createFilteredConsole(rawConsole);

  runtimeState = {
    initialized: true,
    loggingConfig: input.loggingConfig,
    logFilePath,
    fileDescriptor,
    rawConsole,
    stdoutFanoutStream,
    stderrFanoutStream,
  };
  return { logFilePath };
};

export const writeRuntimeLogRecord = (level: PinoLogLevel, formattedMessage: string): void => {
  writeToRuntimeConsole(level, [formattedMessage]);
};

export const getFastifyLoggerOptions = (
  loggingConfig: LoggingConfig,
): { level: LoggingConfig["pinoLogLevel"]; stream?: Writable } => {
  if (!runtimeState.stdoutFanoutStream) {
    return { level: loggingConfig.pinoLogLevel };
  }
  return {
    level: loggingConfig.pinoLogLevel,
    stream: runtimeState.stdoutFanoutStream,
  };
};

export const __testOnly = {
  resetRuntimeLoggerBootstrap: resetRuntimeState,
};
