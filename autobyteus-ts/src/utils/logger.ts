import fs from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

let initialized = false;
let fileStream: fs.WriteStream | null = null;
let currentLevel: LogLevel = 'info';
let currentFilePath: string | null = null;
let currentConsoleEnabled = true;

const original = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

const LOGGER_MARK = Symbol.for('autobyteus.logger');

function markLogger(fn: (...args: unknown[]) => void): void {
  const marker = fn as typeof fn & { [key: symbol]: boolean };
  marker[LOGGER_MARK] = true;
}

function isLoggerAttached(): boolean {
  return Boolean((console.info as typeof console.info & { [key: symbol]: boolean })[LOGGER_MARK]);
}

function normalizeLevel(value?: string | null): LogLevel {
  if (!value) {
    return 'info';
  }
  const normalized = value.toLowerCase();
  if (normalized in LEVELS) {
    return normalized as LogLevel;
  }
  return 'info';
}

function ensureFileStream(filePath: string): fs.WriteStream {
  if (fileStream) {
    return fileStream;
  }
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fileStream = fs.createWriteStream(resolved, { flags: 'a' });
  return fileStream;
}

function formatLine(level: LogLevel, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = format(...args);
  return `${timestamp} [${level.toUpperCase()}] ${message}\n`;
}

function attachLogger(level: LogLevel, filePath?: string | null, consoleEnabled: boolean = true): void {
  const threshold = LEVELS[level];
  const file = filePath ? ensureFileStream(filePath) : null;

  const write = (target: keyof typeof original, msgLevel: LogLevel, args: unknown[]) => {
    const allowed = LEVELS[msgLevel] >= threshold;
    if (allowed) {
      if (consoleEnabled) {
        original[target](...args);
      }
      if (file) {
        file.write(formatLine(msgLevel, args));
      }
    }
  };

  console.debug = (...args: unknown[]) => write('debug', 'debug', args);
  console.info = (...args: unknown[]) => write('info', 'info', args);
  console.log = (...args: unknown[]) => write('log', 'info', args);
  console.warn = (...args: unknown[]) => write('warn', 'warn', args);
  console.error = (...args: unknown[]) => write('error', 'error', args);

  markLogger(console.debug);
  markLogger(console.info);
  markLogger(console.log);
  markLogger(console.warn);
  markLogger(console.error);
}

export function initializeLogging(options?: {
  level?: string;
  filePath?: string | null;
  consoleEnabled?: boolean;
}): void {
  const envLevel = process.env.AUTOBYTEUS_LOG_LEVEL;
  const envFilePath = process.env.AUTOBYTEUS_LOG_FILE;
  const envConsole = process.env.AUTOBYTEUS_LOG_CONSOLE;
  const hasExplicitOptions =
    options?.level !== undefined ||
    options?.filePath !== undefined ||
    options?.consoleEnabled !== undefined ||
    envLevel !== undefined ||
    envFilePath !== undefined ||
    envConsole !== undefined;
  let level = normalizeLevel(options?.level ?? envLevel);
  let filePath = options?.filePath ?? envFilePath ?? null;
  let consoleEnabled =
    options?.consoleEnabled ??
    (envConsole ? envConsole.toLowerCase() === 'true' : filePath ? false : true);
  const needsReattach = initialized && !isLoggerAttached();

  if (initialized && !hasExplicitOptions) {
    level = currentLevel;
    filePath = currentFilePath;
    consoleEnabled = currentConsoleEnabled;
  }
  if (initialized) {
    if (!hasExplicitOptions && !needsReattach) {
      return;
    }
    if (needsReattach || level !== currentLevel || filePath !== currentFilePath || consoleEnabled !== currentConsoleEnabled) {
      attachLogger(level, filePath, consoleEnabled);
      currentLevel = level;
      currentFilePath = filePath;
      currentConsoleEnabled = consoleEnabled;
      if (filePath) {
        console.info(
          `Logging initialized. Level=${level}, file=${path.resolve(filePath)}, console=${consoleEnabled}`
        );
      }
    }
    return;
  }
  attachLogger(level, filePath, consoleEnabled);
  initialized = true;
  currentLevel = level;
  currentFilePath = filePath;
  currentConsoleEnabled = consoleEnabled;
  if (filePath) {
    console.info(
      `Logging initialized. Level=${level}, file=${path.resolve(filePath)}, console=${consoleEnabled}`
    );
  }
}
