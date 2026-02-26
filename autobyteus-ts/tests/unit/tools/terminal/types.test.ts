import { describe, it, expect } from 'vitest';
import { BackgroundProcessOutput, ProcessInfo, TerminalResult } from '../../../../src/tools/terminal/types.js';

describe('terminal types', () => {
  it('creates TerminalResult with provided values', () => {
    const result = new TerminalResult('out', 'err', 0, false);

    expect(result.stdout).toBe('out');
    expect(result.stderr).toBe('err');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('allows null exitCode for TerminalResult', () => {
    const result = new TerminalResult('out', '', null, true);

    expect(result.exitCode).toBeNull();
    expect(result.timedOut).toBe(true);
  });

  it('creates BackgroundProcessOutput with provided values', () => {
    const output = new BackgroundProcessOutput('log', true, 'bg_001');

    expect(output.output).toBe('log');
    expect(output.isRunning).toBe(true);
    expect(output.processId).toBe('bg_001');
  });

  it('creates ProcessInfo with provided values', () => {
    const info = new ProcessInfo('bg_002', 'npm run dev', 123.45, false);

    expect(info.processId).toBe('bg_002');
    expect(info.command).toBe('npm run dev');
    expect(info.startedAt).toBe(123.45);
    expect(info.isRunning).toBe(false);
  });
});
