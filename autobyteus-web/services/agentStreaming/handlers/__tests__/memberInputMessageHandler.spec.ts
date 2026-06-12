import { describe, expect, it } from 'vitest';
import { handleMemberInputMessage } from '../memberInputMessageHandler';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

describe('handleMemberInputMessage', () => {
  it('preserves richer local context files when a deduped member-input echo has none', () => {
    const existingAttachment = hydrateContextAttachment({
      locator: '/rest/team-runs/team-1/members/solution_designer/context-files/ctx_abc__image.png',
      type: 'Image',
    });
    const context = {
      conversation: {
        messages: [
          {
            type: 'user',
            text: 'please inspect this image',
            timestamp: new Date('2026-06-11T12:00:00.000Z'),
            messageId: 'msg-1',
            dedupeKey: 'dedupe-1',
            contextFilePaths: [existingAttachment],
          },
        ],
      },
      isSending: false,
    } as any;

    handleMemberInputMessage(
      {
        content: 'please inspect this image',
        received_at: '2026-06-11T12:00:01.000Z',
        message_id: 'msg-1',
        dedupe_key: 'dedupe-1',
        context_file_paths: [],
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0].contextFilePaths).toEqual([existingAttachment]);
    expect(context.conversation.messages[0].timestamp.toISOString()).toBe('2026-06-11T12:00:01.000Z');
    expect(context.isSending).toBe(true);
  });

  it('hydrates lower-case context file types from incoming member-input echoes', () => {
    const context = {
      conversation: { messages: [] },
      isSending: false,
    } as any;

    handleMemberInputMessage(
      {
        content: 'image without extension',
        message_id: 'msg-2',
        context_file_paths: [
          {
            path: 'local-file://opaque-context-file',
            type: 'image',
          },
        ],
      },
      context,
    );

    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0].contextFilePaths).toHaveLength(1);
    expect(context.conversation.messages[0].contextFilePaths[0]).toMatchObject({
      locator: 'local-file://opaque-context-file',
      type: 'Image',
    });
  });
});
