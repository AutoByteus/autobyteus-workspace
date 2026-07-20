import { describe, expect, it } from 'vitest';
import type { EventMonitorActiveTracePageEventDto } from '../eventMonitorActiveTracePageService';
import { buildEventMonitorActiveTraceBrowsePresentation } from '../eventMonitorActiveTraceBrowsePresentation';

const textEvent = (eventId: string, visualId: string): EventMonitorActiveTracePageEventDto => ({
  __typename: 'EventMonitorActiveTracePageEvent',
  eventId,
  turnGroupId: 'turn:v1:1:t',
  occurredAtMs: 10,
  visuals: [{
    __typename: 'EventMonitorAssistantTextVisual',
    kind: 'assistant_text',
    eventId,
    visualId,
    kindOrdinal: 0,
    content: 'Done',
  }],
});

describe('event monitor active trace browse presentation', () => {
  it('retains equal-content events as distinct stable visual identities', () => {
    const presentation = buildEventMonitorActiveTraceBrowsePresentation([
      textEvent('raw:r17', 'visual:r17'),
      textEvent('raw:r18', 'visual:r18'),
    ]);
    expect(presentation).toHaveLength(1);
    expect(presentation[0]).toMatchObject({
      kind: 'assistant',
      key: 'visual:r17',
      visuals: [
        { visualId: 'visual:r17', content: 'Done' },
        { visualId: 'visual:r18', content: 'Done' },
      ],
    });
  });

  it('uses the first carried visual identity for every rendered row key', () => {
    const presentation = buildEventMonitorActiveTraceBrowsePresentation([
      textEvent('raw:r17', 'visual:r17'),
      {
        __typename: 'EventMonitorActiveTracePageEvent', eventId: 'raw:user',
        turnGroupId: 'turn:v1:1:t', occurredAtMs: 11,
        visuals: [{
          __typename: 'EventMonitorUserVisual', kind: 'user', eventId: 'raw:user',
          visualId: 'visual:user', kindOrdinal: 0, text: 'break', attachments: [],
        }],
      },
      textEvent('raw:r18', 'visual:r18'),
    ]);
    expect(presentation.map(item => item.key)).toEqual(['visual:r17', 'visual:user', 'visual:r18']);
  });

  it('maps multi-visual tools through the closed shallow tool presentation', () => {
    const event: EventMonitorActiveTracePageEventDto = {
      __typename: 'EventMonitorActiveTracePageEvent',
      eventId: 'tool-event',
      turnGroupId: 'tool-turn',
      occurredAtMs: 20,
      visuals: [
        {
          __typename: 'EventMonitorToolCardVisual', kind: 'tool_card', eventId: 'tool-event',
          visualId: 'tool-visual', kindOrdinal: 0, invocationId: 'call', cardKind: 'tool_call',
          toolName: 'search_web', statusKey: 'success', errorMessage: null,
          summaryArgs: { __typename: 'EventMonitorToolSummaryArgs', query: 'cats' },
          approvalTarget: null,
        },
        {
          __typename: 'EventMonitorMediaVisual', kind: 'media', eventId: 'tool-event',
          visualId: 'image-visual', kindOrdinal: 0, mediaType: 'image', urls: ['image://one'],
        },
      ],
    };
    const presentation = buildEventMonitorActiveTraceBrowsePresentation([event]);
    expect(presentation[0]).toMatchObject({
      kind: 'assistant',
      visuals: [
        { kind: 'tool', visualId: 'tool-visual', presentation: { statusKey: 'success', summary: { text: 'cats' } } },
        { kind: 'media', visualId: 'image-visual', segment: { mediaType: 'image' } },
      ],
    });
  });
});
