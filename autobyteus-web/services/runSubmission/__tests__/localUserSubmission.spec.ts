import { describe, expect, it, vi } from 'vitest';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
} from '../localUserSubmission';

const buildContext = () => ({
  state: {
    conversation: {
      messages: [] as any[],
      updatedAt: '2026-05-17T00:00:00.000Z',
    },
  },
  requirement: 'draft text',
  contextFilePaths: [{ kind: 'workspace_path', id: 'draft', locator: '/tmp/draft.txt', displayName: 'draft.txt', type: 'Text' }],
  isSending: false,
}) as any;

describe('localUserSubmission', () => {
  it('appends the local user message, clears the composer, and applies startup status', () => {
    const context = buildContext();
    const applyInitializing = vi.fn();
    const draftAttachments = [...context.contextFilePaths];

    const handle = beginLocalUserSubmission(context, {
      text: 'hello runtime',
      attachments: draftAttachments,
      applyInitializing,
    });

    expect(context.state.conversation.messages).toHaveLength(1);
    expect(context.state.conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'hello runtime',
      contextFilePaths: draftAttachments,
    });
    expect(handle.message).toBe(context.state.conversation.messages[0]);
    expect(context.requirement).toBe('');
    expect(context.contextFilePaths).toEqual([]);
    expect(context.isSending).toBe(true);
    expect(applyInitializing).toHaveBeenCalledTimes(1);
  });

  it('reconciles finalized attachments on the existing local message', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'send with file',
      attachments: context.contextFilePaths,
    });
    const finalized = [{ kind: 'uploaded', id: 'final', locator: '/files/final.txt', storedFilename: 'final.txt', displayName: 'final.txt', phase: 'final', type: 'Text' }];

    finalizeLocalSubmissionAttachments(handle, finalized as any);

    expect(context.state.conversation.messages).toHaveLength(1);
    expect(context.state.conversation.messages[0]).toBe(handle.message);
    expect(handle.message.contextFilePaths).toEqual(finalized);
  });

  it('keeps the submitted message visible and appends system error feedback on failure', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'will fail',
      attachments: [],
    });

    failLocalSubmission(handle, new Error('backend unavailable'));

    expect(context.isSending).toBe(false);
    expect(context.state.conversation.messages).toHaveLength(2);
    expect(context.state.conversation.messages[0]).toBe(handle.message);
    expect(context.state.conversation.messages[1]).toMatchObject({
      type: 'ai',
      isComplete: true,
      segments: [expect.objectContaining({
        type: 'error',
        source: 'System',
        message: 'backend unavailable',
      })],
    });
    expect(context.requirement).toBe('');
  });
});
