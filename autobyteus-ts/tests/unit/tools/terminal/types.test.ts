import { describe, it, expect } from 'vitest';
import {
  BackgroundProcessInfo,
  BackgroundProcessOutput,
  TerminalResult
} from '../../../../src/tools/terminal/types.js';

describe('terminal types', () => {
  it('creates TerminalResult with provided values', () => {
    const background = new BackgroundProcessInfo(1234, 'npm run dev &', '2026-05-14T00:00:00.000Z', 'running', '/tmp/project');
    const result = new TerminalResult('out', 'err', 0, false, '/tmp/project', [background]);

    expect(result.stdout).toBe('out');
    expect(result.stderr).toBe('err');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.effectiveCwd).toBe('/tmp/project');
    expect(result.backgroundProcesses).toEqual([background]);
  });

  it('allows null exitCode for TerminalResult', () => {
    const result = new TerminalResult('out', '', null, true, '/tmp/project');

    expect(result.exitCode).toBeNull();
    expect(result.timedOut).toBe(true);
    expect(result.effectiveCwd).toBe('/tmp/project');
    expect(result.backgroundProcesses).toEqual([]);
  });

  it('creates BackgroundProcessOutput with PID identity', () => {
    const output = new BackgroundProcessOutput('log', true, 1234, 'running');

    expect(output.output).toBe('log');
    expect(output.isRunning).toBe(true);
    expect(output.pid).toBe(1234);
    expect(output.status).toBe('running');
  });

  it('creates BackgroundProcessInfo with PID identity', () => {
    const info = new BackgroundProcessInfo(2345, 'npm run dev', '2026-05-14T00:00:00.000Z', 'exited', '/tmp/project');

    expect(info.pid).toBe(2345);
    expect(info.command).toBe('npm run dev');
    expect(info.startedAt).toBe('2026-05-14T00:00:00.000Z');
    expect(info.status).toBe('exited');
    expect(info.effectiveCwd).toBe('/tmp/project');
  });
});
