import { describe, expect, it } from 'vitest';
import { handleExternalUserMessage } from '../externalUserMessageHandler';
import { handleMemberInputMessage } from '../memberInputMessageHandler';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const buildContext = (contextFilePaths: any[], identity = 'msg-1') => ({
  conversation: {
    messages: [
      {
        type: 'user',
        text: 'please inspect this context',
        timestamp: new Date('2026-06-11T12:00:00.000Z'),
        messageId: identity,
        dedupeKey: `dedupe-${identity}`,
        contextFilePaths,
      },
    ],
  },
  isSending: false,
}) as any;

const unsupportedImage = () => hydrateContextAttachment({
  locator: 'local-file://opaque/image.png',
  type: 'image',
});

describe('handleMemberInputMessage', () => {
  it('retains existing non-executable metadata when an identity-matched echo has no attachments', () => {
    const unsupported = unsupportedImage();
    const executable = hydrateContextAttachment({ locator: '/tmp/current.md', type: 'Markdown' });
    const context = buildContext([executable, unsupported]);

    handleMemberInputMessage(
      {
        content: 'please inspect this context',
        received_at: '2026-06-11T12:00:01.000Z',
        message_id: 'msg-1',
        dedupe_key: 'dedupe-msg-1',
        context_file_paths: [],
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0].contextFilePaths).toEqual([unsupported]);
    expect(context.conversation.messages[0].timestamp.toISOString()).toBe('2026-06-11T12:00:01.000Z');
    expect(context.isSending).toBe(true);
  });

  it('refreshes incoming executable attachments and retains one existing unsupported item for mixed echoes', () => {
    const unsupported = unsupportedImage();
    const staleExecutable = hydrateContextAttachment({ locator: '/tmp/stale.md', type: 'Markdown' });
    const context = buildContext([staleExecutable, unsupported, unsupported]);

    handleMemberInputMessage(
      {
        content: 'please inspect this context',
        message_id: 'msg-1',
        dedupe_key: 'dedupe-msg-1',
        context_file_paths: [
          { path: '/tmp/current.md', type: 'markdown' },
          { path: 'https://cdn.example/proof.png', type: 'image' },
        ],
      },
      context,
    );

    expect(context.conversation.messages[0].contextFilePaths).toMatchObject([
      { kind: 'workspace_path', locator: '/tmp/current.md', type: 'Markdown' },
      { kind: 'external_url', locator: 'https://cdn.example/proof.png', type: 'Image' },
      { kind: 'unsupported_local_file', locator: 'local-file://opaque/image.png', type: 'Image' },
    ]);
  });

  it('does not merge non-executable items into an unrelated message identity', () => {
    const context = buildContext([unsupportedImage()], 'msg-local');

    handleMemberInputMessage(
      {
        content: 'a separate message',
        message_id: 'msg-other',
        dedupe_key: 'dedupe-msg-other',
        context_file_paths: [],
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(2);
    expect(context.conversation.messages[0].contextFilePaths).toHaveLength(1);
    expect(context.conversation.messages[1].contextFilePaths).toEqual([]);
  });

  it('hydrates historical unsupported locator types from incoming member projections', () => {
    const context = { conversation: { messages: [] }, isSending: false } as any;

    handleMemberInputMessage(
      {
        content: 'historical image without a valid local path',
        message_id: 'msg-2',
        context_file_paths: [{ path: 'local-file://opaque-context-file', type: 'image' }],
      },
      context,
    );

    expect(context.conversation.messages[0].contextFilePaths[0]).toMatchObject({
      kind: 'unsupported_local_file',
      locator: 'local-file://opaque-context-file',
      type: 'Image',
    });
  });

  it('keeps external-user identity replacement incoming-authoritative', () => {
    const context = buildContext([unsupportedImage()]);

    handleExternalUserMessage(
      {
        content: 'external replacement',
        message_id: 'msg-1',
        dedupe_key: 'dedupe-msg-1',
        context_file_paths: [],
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0].contextFilePaths).toEqual([]);
  });
});
