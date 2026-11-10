import { describe, it, expect } from 'vitest';
import { TerminalResult, type BackgroundTaskEnd, type BackgroundTaskStart } from '../../../../src/tools/terminal/types.js';

const started: BackgroundTaskStart = { pid: 1234, command: 'npm run dev &', effectiveCwd: '/tmp/project',
  outputFile: '/tmp/autobyteus-background-tasks/a/call-1-2.log', startedAt: '2026-11-10T00:00:00.000Z' };
const ended: BackgroundTaskEnd = { pid: 1200, command: 'pnpm build', outcome: { exitCode: 0 }, durationMs: 1200,
  outputFile: '/tmp/autobyteus-background-tasks/a/call-0-1.log', lastLines: 'done' };

describe('terminal types', () => {
  it('serializes only the fields a foreground result has', () => {
    expect(new TerminalResult('', '', 0, false, '/tmp/project').toJSON()).toEqual({ exitCode: 0, effectiveCwd: '/tmp/project' });
    expect(new TerminalResult('out', '', null, true, '/tmp/project').toJSON())
      .toEqual({ exitCode: null, effectiveCwd: '/tmp/project', stdout: 'out', timedOut: true });
  });

  it('serializes the background tasks a call started and the ends it saw (AC-010, REQ-015)', () => {
    const json = new TerminalResult('started\n', 'err', 0, false, '/tmp/project', [started], [ended]).toJSON();
    expect(json).toEqual({ exitCode: 0, effectiveCwd: '/tmp/project', stdout: 'started\n', stderr: 'err',
      backgroundTasksStarted: [started], backgroundTasksEnded: [ended] });
    expect(json).not.toHaveProperty('backgroundProcesses');
  });
});
