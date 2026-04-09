import util from "node:util";
import {
  getLoggingConfigFromEnv,
  resolveScopedLogLevel,
  shouldEmitLog,
  type LoggingConfig,
  type PinoLogLevel,
} from "../config/logging-config.js";
import { writeRuntimeLogRecord } from "./runtime-logger-bootstrap.js";

type LogMethodArgs = [message?: unknown, ...args: unknown[]];

export type ServerAppLogger = {
  child: (scope: string) => ServerAppLogger;
  trace: (...args: LogMethodArgs) => void;
  debug: (...args: LogMethodArgs) => void;
  info: (...args: LogMethodArgs) => void;
  warn: (...args: LogMethodArgs) => void;
  error: (...args: LogMethodArgs) => void;
  fatal: (...args: LogMethodArgs) => void;
  isLevelEnabled: (level: PinoLogLevel) => boolean;
  getLoggerName: () => string;
};

type ServerAppLoggerState = {
  loggingConfig: LoggingConfig;
};

const DEFAULT_LOGGER_NAME = "server.app";

let loggerState: ServerAppLoggerState = {
  loggingConfig: getLoggingConfigFromEnv(process.env),
};

const normalizeScopeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

const joinLoggerScope = (parentScope: string, childScope: string): string => {
  const normalizedChildScope = normalizeScopeSegment(childScope);
  if (!normalizedChildScope) {
    return parentScope;
  }
  if (!parentScope) {
    return normalizedChildScope;
  }
  return `${parentScope}.${normalizedChildScope}`;
};

const formatServerLogRecord = (
  level: PinoLogLevel,
  loggerName: string,
  message: unknown,
  args: unknown[],
): string => {
  const timestamp = new Date().toISOString();
  const formattedMessage = util.format(message, ...args);
  return `[${timestamp}] [${level.toUpperCase()}] [${loggerName}] ${formattedMessage}`;
};

class DefaultServerAppLogger implements ServerAppLogger {
  constructor(private readonly loggerName: string) {}

  child(scope: string): ServerAppLogger {
    return new DefaultServerAppLogger(joinLoggerScope(this.loggerName, scope));
  }

  trace(...args: LogMethodArgs): void {
    this.log("trace", args);
  }

  debug(...args: LogMethodArgs): void {
    this.log("debug", args);
  }

  info(...args: LogMethodArgs): void {
    this.log("info", args);
  }

  warn(...args: LogMethodArgs): void {
    this.log("warn", args);
  }

  error(...args: LogMethodArgs): void {
    this.log("error", args);
  }

  fatal(...args: LogMethodArgs): void {
    this.log("fatal", args);
  }

  isLevelEnabled(level: PinoLogLevel): boolean {
    return shouldEmitLog(
      resolveScopedLogLevel(loggerState.loggingConfig, this.loggerName),
      level,
    );
  }

  getLoggerName(): string {
    return this.loggerName;
  }

  private log(level: PinoLogLevel, args: LogMethodArgs): void {
    const [message = "", ...restArgs] = args;
    if (!this.isLevelEnabled(level)) {
      return;
    }
    writeRuntimeLogRecord(level, formatServerLogRecord(level, this.loggerName, message, restArgs));
  }
}

export const initializeServerAppLogger = (loggingConfig: LoggingConfig): void => {
  loggerState = { loggingConfig };
};

export const createServerLogger = (loggerName: string): ServerAppLogger =>
  new DefaultServerAppLogger(normalizeScopeSegment(loggerName) || DEFAULT_LOGGER_NAME);

export const serverLogger = createServerLogger("server");

export const __testOnly = {
  resetServerAppLoggerState: (): void => {
    loggerState = {
      loggingConfig: getLoggingConfigFromEnv(process.env),
    };
  },
};
