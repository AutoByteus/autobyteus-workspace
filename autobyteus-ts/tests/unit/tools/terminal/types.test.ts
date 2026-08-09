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

  it('serializes a clean successful result omitting empty/no-op fields (AC-001)', () => {
    const result = new TerminalResult('', '', 0, false, '/tmp/project');

    const json = result.toJSON();

    expect(json.effectiveCwd).toBe('/tmp/project');
    expect(json.exitCode).toBe(0);
    expect(json).not.toHaveProperty('stdout');
    expect(json).not.toHaveProperty('stderr');
    expect(json).not.toHaveProperty('timedOut');
    expect(json).not.toHaveProperty('backgroundProcesses');
  });

  it('serializes non-empty stderr, timedOut, and backgroundProcesses when present (AC-002)', () => {
    const background = new BackgroundProcessInfo(1234, 'npm run dev &', '2026-05-14T00:00:00.000Z', 'running', '/tmp/project');
    const result = new TerminalResult('out', 'warn', 1, true, '/tmp/project', [background]);

    const json = result.toJSON();

    expect(json.stdout).toBe('out');
    expect(json.effectiveCwd).toBe('/tmp/project');
    expect(json.exitCode).toBe(1);
    expect(json.stderr).toBe('warn');
    expect(json.timedOut).toBe(true);
    expect(json.backgroundProcesses).toEqual([background]);
  });
});
