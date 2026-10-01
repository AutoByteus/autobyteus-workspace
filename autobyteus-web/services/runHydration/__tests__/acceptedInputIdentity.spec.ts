import { describe, expect, it } from 'vitest';
import { buildConversationFromProjection, type RunProjectionConversationEntry as Entry } from '../runProjectionConversation';
import { dedupeRunProjectionConversationEntries as serverDedupe } from '../../../../autobyteus-server-ts/src/run-history/projection/run-projection-dedupe';
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import type { UserMessage } from '~/types/conversation';
const base: Entry = { kind: 'message', role: 'user', content: 'identical', ts: 123 };
const build = (entries: Entry[]) => buildConversationFromProjection('recipient', entries, {
  agentDefinitionId: 'definition', agentName: 'recipient', llmModelIdentifier: 'parent',
});
const count = (entries: Entry[]) => build(entries).messages.length;
const server = (entries: Entry[]): Entry[] => serverDedupe(entries as Parameters<typeof serverDedupe>[0]);

describe('saved input identity in both independently applied dedupe layers', () => {
  it.each([
    [{ messageId: 'A', dedupeKey: 'x' }, { messageId: 'B', dedupeKey: 'x' }, 2],
    [{ messageId: 'A', dedupeKey: 'x' }, { dedupeKey: 'x' }, 2],
    [{ messageId: 'x' }, { dedupeKey: 'x' }, 2],
    [{ messageId: ' A ', dedupeKey: 'old' }, { messageId: 'A', dedupeKey: 'new' }, 1],
    [{ dedupeKey: ' x ' }, { dedupeKey: 'x' }, 1],
    [{ messageId: 'A' }, {}, 2],
    [{ messageId: 'a' }, { messageId: 'A' }, 2],
    [{ messageId: ' ' }, { messageId: undefined }, 1],
  ] as const)('primary policy %j / %j -> %s', (left, right, expected) => {
    const entries = [{ ...base, ...left }, { ...base, ...right }];
    expect(server(entries)).toHaveLength(expected);
    expect(count(entries)).toBe(expected);
    expect(count(server(entries))).toBe(expected);
  });
  it('never collapses exact sender provenance, even keyless same-body/time rows', () => {
    for (const identity of [{}, { messageId: 'A' }]) {
      for (const field of ['senderId', 'senderAgentRunId', 'senderAddress']) {
        const entries = [undefined, 'sender', ' sender', 'other'].map(sender => ({ ...base, kind: 'inter_agent_message', ...identity, [field]: sender }));
        expect(server(entries)).toHaveLength(4); expect(count(entries)).toBe(4);
      }
      const entries = [{ ...base, ...identity }, { ...base, ...identity, kind: 'inter_agent_message', senderAgentRunId: 'peer' }];
      expect(server(entries)).toHaveLength(2); expect(count(entries)).toBe(2);
    }
  });
  it('does not read untyped input identity aliases or transitively join dedupe-only entries', () => {
    const entries = [
      { ...base, messageId: 'A', dedupeKey: 'shared' }, { ...base, dedupeKey: 'shared' },
      { ...base, messageId: 'B', dedupeKey: 'shared' },
    ];
    expect(server(entries)).toHaveLength(3); expect(count(entries)).toBe(3);
    const alias = { ...base, ts: 124, metadata: { message_id: 'A' }, message_id: 'A' };
    expect(server([entries[0], alias])).toHaveLength(2); expect(count([entries[0], alias])).toBe(2);
  });
  it('unions saved media and exact locator+type files, preserves first timestamp/known keys/names', () => {
    const entries: Entry[] = [
      { ...base, messageId: 'A', dedupeKey: 'first', media: { images: ['/image.png'] }, fileAttachments: [
        { uri: '/a/report.txt', fileType: 'text', fileName: 'Rich report' },
      ] },
      { ...base, ts: 456, messageId: 'A', dedupeKey: 'second', content: '', media: { audio: ['/audio.wav'] }, fileAttachments: [
        { uri: '/a/report.txt', fileType: 'text', fileName: null },
        { uri: '/b/report.txt', fileType: 'text', fileName: 'Rich report' },
        { uri: '/a/report.txt', fileType: 'pdf', fileName: 'PDF view' },
      ] },
      { ...base, ts: 789, messageId: 'A', media: {}, fileAttachments: [] },
    ];
    for (const projected of [entries, server(entries)]) {
      const messages = build(projected).messages as UserMessage[];
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({ messageId: 'A', dedupeKey: 'first', timestamp: new Date(123000), text: 'identical' });
      expect(messages[0].contextFilePaths).toHaveLength(5);
      expect(messages[0].contextFilePaths).toContainEqual(expect.objectContaining({ locator: '/a/report.txt', type: 'Text', displayName: 'Rich report' }));
    }
  });
});

describe('named pending overlay, not accepted-echo attachment replacement', () => {
  it('preserves history media, timestamp, provenance and richer names, and remains local to the recipient', () => {
    const conversation = build([{ ...base, messageId: 'A', dedupeKey: 'old', media: { images: ['/image.png'] }, fileAttachments: [
      { uri: '/a/report.txt', fileType: 'text', fileName: 'Rich original name' },
      { uri: '/fill.txt', fileType: 'text', fileName: null },
    ] }]);
    const message = conversation.messages[0] as UserMessage;
    message.mentionNames = ['peer'];
    const context = { state: {}, conversation } as any;
    const other = { state: {}, conversation: build([{ ...base, messageId: 'A' }]) } as any;
    const payload = { run_instance_id: 'native', revision: 1, recoverableBlock: null, entries: [{
      sequence: 1, message_id: ' A ', dedupe_key: 'new', turn_id: 'turn', state: 'held' as const,
      content: 'original pending text', sender_type: 'user' as const, file_attachments: [
        { uri: '/a/report.txt', file_type: 'text', file_name: null },
        { uri: '/b/report.txt', file_type: 'text', file_name: 'Rich original name' },
        { uri: '/fill.txt', file_type: 'text', file_name: 'Explicit filled name' },
        { uri: '/a/report.txt', file_type: 'pdf', file_name: 'PDF view' },
      ],
    }] };
    handleAgentInputState(payload, context);
    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0]).toMatchObject({ messageId: 'A', dedupeKey: 'new', mentionNames: ['peer'],
      text: 'original pending text', timestamp: new Date(123000), pendingInput: { state: 'held' } });
    expect(context.conversation.messages[0].contextFilePaths).toHaveLength(5);
    expect(context.conversation.messages[0].contextFilePaths).toContainEqual(hydrateContextAttachment({ locator: '/a/report.txt', type: 'text', displayName: 'Rich original name' }));
    expect(context.conversation.messages[0].contextFilePaths).toContainEqual(hydrateContextAttachment({ locator: '/fill.txt', type: 'text', displayName: 'Explicit filled name' }));
    handleAgentInputState({ ...payload, revision: 2, entries: [{ ...payload.entries[0], dedupe_key: null, file_attachments: [] }] }, context);
    expect(context.conversation.messages[0].dedupeKey).toBe('new');
    expect(context.conversation.messages[0].contextFilePaths).toHaveLength(5);
    expect(other.conversation.messages[0]).not.toHaveProperty('pendingInput');
    handleAgentInputState({ ...payload, revision: 3, entries: [{ ...payload.entries[0], message_id: 'B' }] }, context);
    expect(context.conversation.messages).toHaveLength(2);
    for (const sender_type of ['agent', 'system'] as const) {
      handleAgentInputState({ ...payload, revision: sender_type === 'agent' ? 4 : 5, entries: [{ ...payload.entries[0], sender_type }] }, context);
      expect(context.conversation.messages).toHaveLength(2);
      expect(context.conversation.messages.every((m: UserMessage) => !m.pendingInput)).toBe(true);
    }
  });
});
