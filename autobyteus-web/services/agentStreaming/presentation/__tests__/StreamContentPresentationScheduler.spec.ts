import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  STREAM_CONTENT_PRESENTATION_INTERVAL_MS,
  StreamContentPresentationScheduler,
} from '../StreamContentPresentationScheduler';
import type { StreamContentPresentationBatch } from '../streamContentPresentationTypes';

const context = (id: string): AgentContext => ({ id } as unknown as AgentContext);

const receipt = (
  delta: string,
  receivedAt: string,
  id = 'segment-1',
  turnId = 'turn-1',
) => ({
  payload: {
    id,
    turn_id: turnId,
    segment_type: 'text' as const,
    delta,
  },
  receivedAt,
});

describe('StreamContentPresentationScheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('uses a fixed non-sliding deadline and coalesces exact identity bytes', () => {
    vi.useFakeTimers();
    const project = vi.fn();
    const scheduler = new StreamContentPresentationScheduler(project);
    const target = context('a');

    scheduler.enqueue(target, receipt('alpha', '2026-08-01T10:00:00.000Z'));
    vi.advanceTimersByTime(90);
    scheduler.enqueue(target, receipt(' beta', '2026-08-01T10:00:00.090Z'));
    vi.advanceTimersByTime(STREAM_CONTENT_PRESENTATION_INTERVAL_MS - 90);

    expect(project).toHaveBeenCalledOnce();
    expect(project).toHaveBeenCalledWith(target, {
      contentPayloads: [expect.objectContaining({ delta: 'alpha beta' })],
      latestActivityAt: '2026-08-01T10:00:00.090Z',
    });
  });

  it('preserves first-seen identity order and latest activity per context', () => {
    const project = vi.fn();
    const scheduler = new StreamContentPresentationScheduler(project);
    const contextA = context('a');
    const contextB = context('b');

    scheduler.enqueue(contextA, receipt('A1', '2026-08-01T10:00:00.001Z', 'segment-a'));
    scheduler.enqueue(contextB, receipt('B', '2026-08-01T10:00:00.002Z', 'segment-b'));
    scheduler.enqueue(contextA, receipt('A2', '2026-08-01T10:00:00.003Z', 'segment-a'));
    scheduler.enqueue(contextA, receipt('C', '2026-08-01T10:00:00.004Z', 'segment-c'));
    scheduler.flush();

    expect(project.mock.calls).toEqual([
      [contextA, {
        contentPayloads: [
          expect.objectContaining({ id: 'segment-a', delta: 'A1A2' }),
          expect.objectContaining({ id: 'segment-c', delta: 'C' }),
        ],
        latestActivityAt: '2026-08-01T10:00:00.004Z',
      }],
      [contextB, {
        contentPayloads: [expect.objectContaining({ id: 'segment-b', delta: 'B' })],
        latestActivityAt: '2026-08-01T10:00:00.002Z',
      }],
    ]);
  });

  it('snapshots and clears before projection so reentrant enqueue is retained once', () => {
    vi.useFakeTimers();
    const target = context('a');
    let scheduler: StreamContentPresentationScheduler;
    const project = vi.fn((_context: AgentContext, _batch: StreamContentPresentationBatch) => {
      if (project.mock.calls.length === 1) {
        scheduler.enqueue(target, receipt('later', '2026-08-01T10:00:00.010Z'));
      }
    });
    scheduler = new StreamContentPresentationScheduler(project);

    scheduler.enqueue(target, receipt('first', '2026-08-01T10:00:00.001Z'));
    scheduler.flush();
    expect(project).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(STREAM_CONTENT_PRESENTATION_INTERVAL_MS);
    expect(project).toHaveBeenCalledTimes(2);
    expect(project.mock.calls[1]?.[1]).toEqual({
      contentPayloads: [expect.objectContaining({ delta: 'later' })],
      latestActivityAt: '2026-08-01T10:00:00.010Z',
    });
  });
});
