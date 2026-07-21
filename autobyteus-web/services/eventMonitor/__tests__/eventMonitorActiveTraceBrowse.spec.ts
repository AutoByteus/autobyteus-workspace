import { effectScope, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { EventMonitorActiveTracePageDto } from '../eventMonitorActiveTracePageService';
import { useEventMonitorActiveTraceBrowse } from '../eventMonitorActiveTraceBrowse';

const pageEvent = (index: number, visualCount = 1) => ({
  __typename: 'EventMonitorActiveTracePageEvent' as const,
  eventId: `e${index}`,
  turnGroupId: `t${index}`,
  occurredAtMs: index,
  visuals: Array.from({ length: visualCount }, (_, ordinal) => ({
    __typename: 'EventMonitorAssistantTextVisual' as const,
    kind: 'assistant_text',
    visualId: `v${index}-${ordinal}`,
    eventId: `e${index}`,
    kindOrdinal: ordinal,
    content: `content-${index}-${ordinal}`,
  })),
});

const response = (events: ReturnType<typeof pageEvent>[], overrides: Partial<EventMonitorActiveTracePageDto> = {}): EventMonitorActiveTracePageDto => ({
  __typename: 'EventMonitorActiveTracePage',
  events,
  beforeCursor: 'cursor',
  hasEarlier: true,
  loadedEarlierCount: Math.min(50, events.length),
  activeGeneration: 'generation',
  cursorStatus: 'VALID',
  ...overrides,
});

describe('useEventMonitorActiveTraceBrowse', () => {
  it('keeps browse isolated, caps central visuals by releasing farthest-newer blocks, and tracks live revision', async () => {
    const revision = ref(0);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(response(Array.from({ length: 150 }, (_, index) => pageEvent(index, 3))))
      .mockResolvedValueOnce(response(Array.from({ length: 50 }, (_, index) => pageEvent(index - 50, 3))));
    const scope = effectScope();
    const browse = scope.run(() => useEventMonitorActiveTraceBrowse({
      subject: { kind: 'run', runId: 'r1' },
      hasEarlierAvailable: true,
      presentationRevision: revision,
      fetchPage,
    }))!;

    await browse.loadEarlier();
    expect(fetchPage).toHaveBeenLastCalledWith({ kind: 'run', runId: 'r1' }, null);
    expect(browse.orderedEvents.value).toHaveLength(100);
    expect(browse.presentation.value.flatMap(item => item.kind === 'assistant' ? item.visuals : [])).toHaveLength(300);
    expect(browse.newerBrowseContentReleased.value).toBe(true);

    revision.value = 1;
    await nextTick();
    expect(browse.hasNewerLiveActivity.value).toBe(true);

    await browse.loadEarlier();
    expect(browse.orderedEvents.value).toHaveLength(100);
    expect(browse.orderedEvents.value[0].eventId).toBe('e-50');
    expect(browse.orderedEvents.value.at(-1)?.eventId).toBe('e49');
    browse.jumpToLatest();
    expect(browse.state.value).toBe('latest');
    expect(browse.orderedEvents.value).toEqual([]);
    scope.stop();
  });

  it('treats every duplicate identity as a typed protocol error without content dedupe', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(response([pageEvent(1)]))
      .mockResolvedValueOnce(response([{ ...pageEvent(1), turnGroupId: 'conflict' }]));
    const browse = useEventMonitorActiveTraceBrowse({
      subject: { kind: 'run', runId: 'r1' },
      hasEarlierAvailable: true,
      presentationRevision: 0,
      fetchPage,
    });
    await browse.loadEarlier();
    await browse.loadEarlier();
    expect(browse.state.value).toBe('error');
    expect(browse.errorMessage.value).toContain("Duplicate active-trace event 'e1'");
  });

  it('rejects a cross-page visual ID collision before mutating retained blocks', async () => {
    const colliding = pageEvent(2);
    colliding.visuals[0]!.visualId = 'v1-0';
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(response([pageEvent(1)]))
      .mockResolvedValueOnce(response([colliding]));
    const browse = useEventMonitorActiveTraceBrowse({
      subject: { kind: 'run', runId: 'r1' }, hasEarlierAvailable: true,
      presentationRevision: 0, fetchPage,
    });
    await browse.loadEarlier();
    await browse.loadEarlier();
    expect(browse.state.value).toBe('error');
    expect(browse.orderedEvents.value.map(event => event.eventId)).toEqual(['e1']);
  });

  it('preserves the frozen browse view when a cursor expires', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(response([pageEvent(1)]))
      .mockResolvedValueOnce(response([], { cursorStatus: 'EXPIRED', beforeCursor: null, hasEarlier: false }));
    const browse = useEventMonitorActiveTraceBrowse({
      subject: { kind: 'run', runId: 'r1' }, hasEarlierAvailable: true,
      presentationRevision: 0, fetchPage,
    });
    await browse.loadEarlier();
    await browse.loadEarlier();
    expect(browse.state.value).toBe('expired');
    expect(browse.orderedEvents.value.map(event => event.eventId)).toEqual(['e1']);
  });

  it('discards every page and cursor immediately when the explicit subject changes', async () => {
    const subject = ref({ kind: 'run' as const, runId: 'r1' });
    const fetchPage = vi.fn().mockResolvedValue(response([pageEvent(1)]));
    const browse = useEventMonitorActiveTraceBrowse({
      subject, hasEarlierAvailable: true, presentationRevision: 0, fetchPage,
    });
    await browse.loadEarlier();
    expect(browse.orderedEvents.value).toHaveLength(1);

    subject.value = { kind: 'run', runId: 'r2' };
    await nextTick();
    expect(browse.state.value).toBe('latest');
    expect(browse.orderedEvents.value).toEqual([]);
    await browse.loadEarlier();
    expect(fetchPage).toHaveBeenLastCalledWith({ kind: 'run', runId: 'r2' }, null);
  });

  it('ignores a stale in-flight response after the subject changes', async () => {
    const subject = ref({ kind: 'run' as const, runId: 'r1' });
    let resolvePage!: (value: EventMonitorActiveTracePageDto) => void;
    const fetchPage = vi.fn().mockReturnValue(new Promise<EventMonitorActiveTracePageDto>(resolve => {
      resolvePage = resolve;
    }));
    const browse = useEventMonitorActiveTraceBrowse({
      subject, hasEarlierAvailable: true, presentationRevision: 0, fetchPage,
    });
    const pending = browse.loadEarlier();
    subject.value = { kind: 'run', runId: 'r2' };
    await nextTick();
    resolvePage(response([pageEvent(1)]));
    await pending;

    expect(browse.state.value).toBe('latest');
    expect(browse.orderedEvents.value).toEqual([]);
  });
});
