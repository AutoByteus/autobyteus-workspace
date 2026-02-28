import { Console } from "node:console";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import type { LoggingConfig } from "../config/logging-config.js";

const originalConsole = globalThis.console;
const SERVER_LOG_FILE_NAME = "server.log";

type RuntimeLoggerBootstrapInput = {
  logsDir: string;
};

type RuntimeLoggerBootstrapState = {
  initialized: boolean;
  logFilePath: string | null;
  fileDescriptor: number | null;
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
  logFilePath: null,
  fileDescriptor: null,
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
    logFilePath: null,
    fileDescriptor: null,
    stdoutFanoutStream: null,
    stderrFanoutStream: null,
  };
};

export const initializeRuntimeLoggerBootstrap = (
  input: RuntimeLoggerBootstrapInput,
): { logFilePath: string } => {
  if (runtimeState.initialized) {
    return { logFilePath: runtimeState.logFilePath ?? path.join(input.logsDir, SERVER_LOG_FILE_NAME) };
  }

  fs.mkdirSync(input.logsDir, { recursive: true });
  const logFilePath = path.resolve(input.logsDir, SERVER_LOG_FILE_NAME);
  const fileDescriptor = fs.openSync(logFilePath, "a");

  const stdoutFanoutStream = new FanoutWritable(process.stdout, fileDescriptor);
  const stderrFanoutStream = new FanoutWritable(process.stderr, fileDescriptor);

  globalThis.console = new Console({
    stdout: stdoutFanoutStream,
    stderr: stderrFanoutStream,
    ignoreErrors: false,
  });

  runtimeState = {
    initialized: true,
    logFilePath,
    fileDescriptor,
    stdoutFanoutStream,
    stderrFanoutStream,
  };
  return { logFilePath };
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
