import { describe, expect, it } from 'vitest';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
} from '../localUserSubmission';

const buildContext = () => ({
  state: {
    runId: 'run-1',
    eventMonitorPresentationRevision: 0,
    markEventMonitorPresentationChanged() {
      this.eventMonitorPresentationRevision += 1;
    },
    conversation: {
      messages: [] as any[],
      updatedAt: '2026-05-17T00:00:00.000Z',
    },
  },
  requirement: 'draft text',
  contextFilePaths: [{ kind: 'workspace_path', id: 'draft', locator: '/tmp/draft.txt', displayName: 'draft.txt', type: 'Text' }],
  isSending: false,
  get conversation() {
    return this.state.conversation;
  },
}) as any;

describe('localUserSubmission', () => {
  it('appends the local user message and leaves canonical runtime status to backend events', () => {
    const context = buildContext();
    const draftAttachments = [...context.contextFilePaths];

    const handle = beginLocalUserSubmission(context, {
      text: 'hello runtime',
      attachments: draftAttachments,
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
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
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
    expect(context.state.eventMonitorPresentationRevision).toBe(2);
  });

  it('does not revise for an equal semantic attachment replacement', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'send with file',
      attachments: context.contextFilePaths,
    });

    finalizeLocalSubmissionAttachments(handle, [{ ...handle.message.contextFilePaths![0]! }] as any);

    expect(context.state.eventMonitorPresentationRevision).toBe(1);
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
    expect(context.state.eventMonitorPresentationRevision).toBe(2);
  });
});
