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

  it('renders an agent-to-agent delivery as "From <Sender>:" opening the reply block (REQ-007, RD-004)', () => {
    const delivery = (eventId: string, text: string, senderAddress: string | null): EventMonitorActiveTracePageEventDto => ({
      __typename: 'EventMonitorActiveTracePageEvent', eventId, turnGroupId: `turn:${eventId}`, occurredAtMs: 9,
      visuals: [{
        __typename: 'EventMonitorInterAgentVisual', kind: 'inter_agent', eventId, visualId: `visual:${eventId}`,
        kindOrdinal: 0, senderAgentRunId: 'lead-run', senderAddress, text, attachments: [],
      }],
    });
    const presentation = buildEventMonitorActiveTraceBrowsePresentation([
      delivery('with-address', 'You received a message from sender name: lead, sender address: /eng/lead, sender id: lead-run\nmessage:\nStatus?', '/eng/lead'),
      textEvent('raw:reply', 'visual:reply', 'turn:with-address'),
      // A stored delivery from before the header carried the address, on a host page (no resolved address).
      delivery('stored', 'You received a message from sender name: lead, sender id: lead-run\nmessage:\nEarlier', null),
    ]);
    expect(presentation).toEqual([
      expect.objectContaining({
        kind: 'assistant', key: 'browse-assistant-group:turn:with-address:visual:with-address',
        visuals: [
          { kind: 'inter_agent', visualId: 'visual:with-address', segment: expect.objectContaining({
            type: 'inter_agent_message', senderAgentRunId: 'lead-run', senderAddress: '/eng/lead', senderName: 'lead', content: 'Status?',
          }) },
          expect.objectContaining({ kind: 'text', visualId: 'visual:reply' }),
        ],
      }),
      expect.objectContaining({
        kind: 'assistant',
        visuals: [{ kind: 'inter_agent', visualId: 'visual:stored', segment: expect.objectContaining({
          senderAddress: null, senderName: 'lead', content: 'Earlier',
        }) }],
      }),
    ]);
    expect(presentation.some((item) => item.kind === 'user')).toBe(false);
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
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-workspace', fileType: 'image', fileName: null, locator: 'images/out.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-external', fileType: 'image', fileName: null, locator: 'https://cdn.example/out.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-rest', fileType: 'image', fileName: null, locator: '/rest/media/render.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-upload', fileType: 'image', fileName: null, locator: '/rest/runs/r1/context-files/ctx_token__proof.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-canonical', fileType: 'image', fileName: null, locator: 'local-file://local/tmp/proof.png' },
          { __typename: 'EventMonitorActiveTraceAttachment', attachmentId: 'a-duplicate', fileType: 'image', fileName: null, locator: 'images/out.png' },
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
