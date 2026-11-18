import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ORIGINAL_CONSOLE = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error
};

const resetConsole = (): void => {
  console.debug = ORIGINAL_CONSOLE.debug;
  console.info = ORIGINAL_CONSOLE.info;
  console.log = ORIGINAL_CONSOLE.log;
  console.warn = ORIGINAL_CONSOLE.warn;
  console.error = ORIGINAL_CONSOLE.error;
};

const clearEnv = (): void => {
  delete process.env.AUTOBYTEUS_LOG_LEVEL;
  delete process.env.AUTOBYTEUS_LOG_FILE;
  delete process.env.AUTOBYTEUS_LOG_CONSOLE;
};

// The logger writes through fs.createWriteStream, which opens the file and writes asynchronously:
// wait for the last expected line instead of a fixed delay (a fixed 25 ms failed under full-suite load).
const readLogWhenContains = async (filePath: string, text: string, timeoutMs = 5000): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const output = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    if (output.includes(text) || Date.now() >= deadline) return output;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('logger initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    resetConsole();
    clearEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetConsole();
    clearEnv();
  });

  it('does not override existing logger when called without explicit options', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-logger-'));
    const filePath = path.join(tmpDir, 'team.log');

    const { initializeLogging } = await import('../../../src/utils/logger.js');

    initializeLogging({ level: 'info', filePath, consoleEnabled: false });
    console.info('first');

    initializeLogging();
    console.info('second');

    const output = await readLogWhenContains(filePath, 'second');
    expect(output).toContain('first');
    expect(output).toContain('second');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('re-attaches logger when env overrides are provided', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-logger-'));
    const filePath = path.join(tmpDir, 'team.log');

    const { initializeLogging } = await import('../../../src/utils/logger.js');

    initializeLogging({ level: 'info', filePath, consoleEnabled: false });
    console.info('one');

    process.env.AUTOBYTEUS_LOG_LEVEL = 'error';
    process.env.AUTOBYTEUS_LOG_FILE = filePath;
    initializeLogging();
    console.info('two');
    console.error('three'); // written at the new level, after 'two' would have been

    const output = await readLogWhenContains(filePath, 'three');
    expect(output).toContain('one');
    expect(output).not.toContain('two');
    expect(output).toContain('three');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
