import { describe, expect, it } from 'vitest';
import type { EventMonitorActiveTracePageEventDto } from '../eventMonitorActiveTracePageService';
import { buildEventMonitorActiveTraceBrowsePresentation } from '../eventMonitorActiveTraceBrowsePresentation';

const textEvent = (
  eventId: string,
  visualId: string,
  turnGroupId = 'turn:v1:1:t',
): EventMonitorActiveTracePageEventDto => ({
  __typename: 'EventMonitorActiveTracePageEvent',
  eventId,
  turnGroupId,
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
      key: 'browse-assistant-group:turn:v1:1:t',
      visuals: [
        { visualId: 'visual:r17', content: 'Done' },
        { visualId: 'visual:r18', content: 'Done' },
      ],
    });
  });

  it('uses stable turn-group row keys while retaining carried visual identities', () => {
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
      textEvent('raw:r18', 'visual:r18', 'turn:v1:2:t2'),
    ]);
    expect(presentation.map(item => item.key)).toEqual([
      'browse-assistant-group:turn:v1:1:t',
      'visual:user',
      'browse-assistant-group:turn:v1:2:t2',
    ]);
  });

  it('reuses the established attachment classifier while preserving server-carried IDs', () => {
    const event: EventMonitorActiveTracePageEventDto = {
      __typename: 'EventMonitorActiveTracePageEvent', eventId: 'raw:user',
      turnGroupId: 'turn:user', occurredAtMs: 11,
      visuals: [{
        __typename: 'EventMonitorUserVisual', kind: 'user', eventId: 'raw:user',
        visualId: 'visual:user', kindOrdinal: 0, text: 'attachments',
        attachments: [
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-workspace', mediaType: 'image', locator: 'images/out.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-external', mediaType: 'image', locator: 'https://cdn.example/out.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-rest', mediaType: 'image', locator: '/rest/media/render.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-upload', mediaType: 'image', locator: '/rest/runs/r1/context-files/ctx_token__proof.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-canonical', mediaType: 'image', locator: 'local-file://local/tmp/proof.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-duplicate', mediaType: 'image', locator: 'images/out.png' },
        ],
      }],
    };
    const [item] = buildEventMonitorActiveTraceBrowsePresentation([event]);
    expect(item?.kind).toBe('user');
    if (item?.kind !== 'user') throw new Error('Expected user presentation.');
    expect(item.message.contextFilePaths).toEqual([
      expect.objectContaining({ kind: 'workspace_path', id: 'a-workspace', locator: 'images/out.png' }),
      expect.objectContaining({ kind: 'external_url', id: 'a-external' }),
      expect.objectContaining({ kind: 'external_url', id: 'a-rest', locator: '/rest/media/render.png' }),
      expect.objectContaining({ kind: 'uploaded', id: 'a-upload', storedFilename: 'ctx_token__proof.png', phase: 'final' }),
      expect.objectContaining({ kind: 'external_url', id: 'a-canonical', locator: 'local-file://local/tmp/proof.png' }),
      expect.objectContaining({ kind: 'workspace_path', id: 'a-duplicate', locator: 'images/out.png' }),
    ]);
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

  it('keeps replayed failure detail out of the compact center presentation', () => {
    const errorMessage = 'replayed diagnostic\nExit code: 23';
    const event: EventMonitorActiveTracePageEventDto = {
      __typename: 'EventMonitorActiveTracePageEvent', eventId: 'failed-tool-event',
      turnGroupId: 'failed-tool-turn', occurredAtMs: 20,
      visuals: [{
        __typename: 'EventMonitorToolCardVisual', kind: 'tool_card', eventId: 'failed-tool-event',
        visualId: 'failed-tool-visual', kindOrdinal: 0, invocationId: 'failed-call', cardKind: 'tool_call',
        toolName: 'run_bash', statusKey: 'error', errorMessage,
        summaryArgs: { __typename: 'EventMonitorToolSummaryArgs', command: 'exit 23' },
        approvalTarget: null,
      }],
    };

    const [item] = buildEventMonitorActiveTraceBrowsePresentation([event]);
    expect(item?.kind).toBe('assistant');
    if (item?.kind !== 'assistant') throw new Error('Expected assistant presentation.');
    const visual = item.visuals[0];
    expect(visual?.kind).toBe('tool');
    if (visual?.kind !== 'tool') throw new Error('Expected tool presentation.');
    expect(visual.presentation).not.toHaveProperty('errorMessage');
    expect(visual.presentation.statusKey).toBe('error');
  });
});
