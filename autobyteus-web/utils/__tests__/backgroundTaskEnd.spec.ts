import { describe, expect, it } from 'vitest';
import { describeBackgroundTaskEnd } from '~/utils/backgroundTaskEnd';
import type { BackgroundTask } from '~/types/backgroundTask';
import type { BackgroundTaskSnapshotRow } from '~/types/backgroundTaskView';

const streamed = (overrides: Partial<BackgroundTask>): BackgroundTask => ({
  taskId: 't', kind: 'shell', description: 'd', command: null, status: 'stopped', summary: null, endReason: null, exitCode: null,
  startedAt: '2026-11-17T10:00:00.000Z', ...overrides,
});
const polled = (overrides: Partial<BackgroundTaskSnapshotRow>): BackgroundTaskSnapshotRow => ({
  taskId: 'p', kind: 'shell', description: 'node', command: null, status: 'failed', summary: null, endReason: null, exitCode: null,
  startedAt: '2026-11-17T10:00:00.000Z', ...overrides,
});

describe('describeBackgroundTaskEnd (autobyteus-483, REQ-004)', () => {
  it.each(['time_limit', 'low_memory', 'run_ended'] as const)('gives the reported end reason %s', (endReason) => {
    expect(describeBackgroundTaskEnd(streamed({ endReason }))).toEqual({ kind: endReason });
  });

  it('prefers the end reason over an exit code', () => {
    expect(describeBackgroundTaskEnd(streamed({ endReason: 'run_ended', exitCode: 143 }))).toEqual({ kind: 'run_ended' });
  });

  it('gives the exit code of a streamed or a polled row, including 0', () => {
    expect(describeBackgroundTaskEnd(streamed({ status: 'failed', exitCode: 1 }))).toEqual({ kind: 'exit_code', code: 1 });
    expect(describeBackgroundTaskEnd(streamed({ status: 'completed', exitCode: 0 }))).toEqual({ kind: 'exit_code', code: 0 });
    expect(describeBackgroundTaskEnd(polled({ status: 'unknown', exitCode: -1 }))).toEqual({ kind: 'exit_code', code: -1 });
  });

  it('gives nothing for a running task or an end without reason or exit code (the summary is shown instead, AC-008)', () => {
    expect(describeBackgroundTaskEnd(streamed({ status: 'running' }))).toBeNull();
    expect(describeBackgroundTaskEnd(streamed({ summary: 'Background command "x" was stopped after reaching its background time limit' }))).toBeNull();
  });
});
