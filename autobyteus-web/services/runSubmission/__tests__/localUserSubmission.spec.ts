import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptLocalSubmission,
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
  retargetLocalUserSubmissionContext,
} from '../localUserSubmission';
import { CollaboratorAddRejection } from '~/services/collaborators/collaboratorAddFailures';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { MessageNotDeliveredError } from '../messageNotDelivered';

const { applyRunNavigationEffectMock } = vi.hoisted(() => ({
  applyRunNavigationEffectMock: vi.fn(),
}));

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    applyRunNavigationEffect: applyRunNavigationEffectMock,
  }),
}));

const buildContext = () => ({
  state: {
    runId: 'run-1',
    currentStatus: AgentStatus.Idle,
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
  submissionPending: false,
  get conversation() {
    return this.state.conversation;
  },
}) as any;

describe('localUserSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends the local user message and leaves canonical runtime status to backend events', () => {
    const context = buildContext();
    const draftAttachments = [...context.contextFilePaths];

    const handle = beginLocalUserSubmission(context, {
      text: 'hello runtime',
      attachments: draftAttachments,
      navigationTarget: { kind: 'standalone', runId: 'run-1' },
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
    expect(context.submissionPending).toBe(true);
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
    expect(applyRunNavigationEffectMock).toHaveBeenCalledTimes(1);
    expect(applyRunNavigationEffectMock).toHaveBeenCalledWith({
      kind: 'standalone',
      runId: 'run-1',
      currentStatus: AgentStatus.Idle,
      summary: 'hello runtime',
    }, {
      kind: 'PRESENTATION',
      occurredAt: expect.any(String),
    });
    // The own send has no time until the node confirms it, and the conversation keeps its server time (D-3).
    expect(handle.message.timestamp).toBeNull();
    expect(context.state.conversation.updatedAt).toBe('2026-05-17T00:00:00.000Z');
  });

  it('applies the same exact summary/activity effect to an existing team member', () => {
    const context = buildContext();
    context.state.conversation.messages.push({
      type: 'user', text: 'existing summary', timestamp: new Date(0),
    });

    beginLocalUserSubmission(context, {
      text: 'follow-up',
      attachments: [],
      navigationTarget: {
        kind: 'team_member',
        teamRunId: 'team-1',
        agentRunId: 'run-1',
      },
    });

    expect(applyRunNavigationEffectMock).toHaveBeenCalledWith({
      kind: 'team_member',
      teamRunId: 'team-1',
      agentRunId: 'run-1',
      currentStatus: AgentStatus.Idle,
      summary: 'existing summary',
    }, expect.objectContaining({ kind: 'PRESENTATION' }));
  });

  it('keeps the first user summary when submitting to an existing standalone run', () => {
    const context = buildContext();
    context.state.conversation.messages.push({
      type: 'user', text: 'original request', timestamp: new Date(0),
    });

    beginLocalUserSubmission(context, {
      text: 'follow-up',
      attachments: [],
      navigationTarget: { kind: 'standalone', runId: 'run-1' },
    });

    expect(applyRunNavigationEffectMock).toHaveBeenCalledWith({
      kind: 'standalone',
      runId: 'run-1',
      currentStatus: AgentStatus.Idle,
      summary: 'original request',
    }, expect.objectContaining({ kind: 'PRESENTATION' }));
  });

  it('reconciles finalized attachments on the existing local message', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'send with file',
      attachments: context.contextFilePaths,
      navigationTarget: { kind: 'standalone', runId: 'run-1' },
    });
    const finalized = [{ kind: 'uploaded', id: 'final', locator: '/files/final.txt', storedFilename: 'final.txt', displayName: 'final.txt', phase: 'final', type: 'Text' }];

    finalizeLocalSubmissionAttachments(handle, finalized as any);

    expect(context.state.conversation.messages).toHaveLength(1);
    expect(context.state.conversation.messages[0]).toBe(handle.message);
    expect(handle.message.contextFilePaths).toEqual(finalized);
    expect(context.state.eventMonitorPresentationRevision).toBe(2);
    expect(applyRunNavigationEffectMock).toHaveBeenCalledTimes(2);
  });

  it('does not revise for an equal semantic attachment replacement', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'send with file',
      attachments: context.contextFilePaths,
      navigationTarget: { kind: 'standalone', runId: 'run-1' },
    });

    finalizeLocalSubmissionAttachments(handle, [{ ...handle.message.contextFilePaths![0]! }] as any);

    expect(context.state.eventMonitorPresentationRevision).toBe(1);
    expect(applyRunNavigationEffectMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the submitted message visible and appends system error feedback on failure', () => {
    const context = buildContext();
    const handle = beginLocalUserSubmission(context, {
      text: 'will fail',
      attachments: [],
      navigationTarget: {
        kind: 'team_member',
        teamRunId: 'team-1',
        agentRunId: 'run-1',
      },
    });

    failLocalSubmission(handle, new Error('backend unavailable'));

    expect(context.submissionPending).toBe(false);
    expect(context.state.conversation.messages).toHaveLength(2);
    expect(context.state.conversation.messages[0]).toBe(handle.message);
    expect(context.state.conversation.messages[1]).toMatchObject({
      type: 'ai',
      isComplete: true,
      segments: [expect.objectContaining({
        type: 'error',
        code: 'LOCAL_SUBMISSION_ERROR',
        message: 'backend unavailable',
      })],
    });
    expect(context.requirement).toBe('');
    expect(context.state.eventMonitorPresentationRevision).toBe(2);
    expect(applyRunNavigationEffectMock).toHaveBeenCalledTimes(2);
    expect(applyRunNavigationEffectMock.mock.calls[1]?.[0]).toMatchObject({
      kind: 'team_member',
      teamRunId: 'team-1',
      agentRunId: 'run-1',
      summary: 'will fail',
    });
  });

  describe('a send with @ mentions is held until the root accepts it (AR-007)', () => {
    const mention = { name: 'Product Team', kind: 'agent_team', definitionId: 'product-team' } as const;

    it('shows nothing and keeps the composer until acceptance, then shows the message once', () => {
      const context = buildContext();
      context.collaboratorAddFailure = { name: 'Old', reason: 'old' };
      const handle = beginLocalUserSubmission(context, {
        text: 'Ask @Product Team', attachments: [], navigationTarget: { kind: 'standalone', runId: 'run-1' }, mentions: [mention],
      });
      expect(handle.held).toBe(true);
      expect(context.state.conversation.messages).toHaveLength(0);
      expect(context.requirement).toBe('draft text');
      expect(context.submissionPending).toBe(true);
      // The next send replaces the previous notice.
      expect(context.collaboratorAddFailure).toBeNull();
      expect(applyRunNavigationEffectMock).not.toHaveBeenCalled();

      handle.message.messageId = 'm-1';
      acceptLocalSubmission(handle);
      acceptLocalSubmission(handle);
      expect(context.state.conversation.messages).toEqual([expect.objectContaining({ type: 'user', text: 'Ask @Product Team', mentionNames: ['Product Team'] })]);
      expect(context.requirement).toBe('');
      expect(applyRunNavigationEffectMock).toHaveBeenCalledTimes(1);
    });

    it('merges into the accepted echo when it arrived first (same identity)', () => {
      const context = buildContext();
      const handle = beginLocalUserSubmission(context, {
        text: 'Ask @Product Team', attachments: [], navigationTarget: null, mentions: [mention],
      });
      handle.message.messageId = 'm-1';
      context.state.conversation.messages.push({ type: 'user', text: 'Ask @Product Team\n\n[Mentioned collaborators]…', messageId: 'm-1', timestamp: new Date() });
      acceptLocalSubmission(handle);
      expect(context.state.conversation.messages).toHaveLength(1);
      expect(context.state.conversation.messages[0]).toMatchObject({ messageId: 'm-1', mentionNames: ['Product Team'] });
    });

    it('a rejected add keeps the draft as typed, posts nothing and shows the notice (VIS-007)', () => {
      const context = buildContext();
      const handle = beginLocalUserSubmission(context, {
        text: 'Ask @Marketing Team', attachments: [], navigationTarget: null, mentions: [{ ...mention, name: 'Marketing Team' }],
      });
      expect(failLocalSubmission(handle, new CollaboratorAddRejection('Marketing Team', 'Its model is not available.'))).toBe('kept_draft');
      expect(context.state.conversation.messages).toHaveLength(0);
      expect(context.requirement).toBe('draft text');
      expect(context.submissionPending).toBe(false);
      expect(context.collaboratorAddFailure).toEqual({ name: 'Marketing Team', reason: 'Its model is not available.' });
    });

    it('any other failure of a held send shows the message with its error, as before', () => {
      const context = buildContext();
      const handle = beginLocalUserSubmission(context, {
        text: 'Ask @Product Team', attachments: [], navigationTarget: null, mentions: [mention],
      });
      expect(failLocalSubmission(handle, new Error('socket closed'))).toBe('failed');
      expect(context.state.conversation.messages.map((message: { type: string }) => message.type)).toEqual(['user', 'ai']);
      expect(context.collaboratorAddFailure ?? null).toBeNull();
    });
  });

  // autobyteus-541 D-A7, D-A7a: a send in flight follows its member into the context a stream recovery committed.
  describe('retargetLocalUserSubmissionContext', () => {
    const identity = { messageId: 'msg-1', dedupeKey: 'key-1' };
    const target = { kind: 'team_member' as const, teamRunId: 'team-1', agentRunId: 'run-1' };

    it('moves a shown message into the new conversation, where its outcome then lands', () => {
      const old = buildContext();
      const next = buildContext();
      next.requirement = '';
      next.contextFilePaths = [];
      next.requestedSkillNames = [];
      const handle = beginLocalUserSubmission(old, { text: 'hello', attachments: [], identity, navigationTarget: target });

      retargetLocalUserSubmissionContext(handle, next);
      expect(handle.context).toBe(next);
      expect(next.state.conversation.messages).toEqual([expect.objectContaining({ type: 'user', text: 'hello', messageId: 'msg-1' })]);

      // Not sent: the draft and its notice come back on the new member, and its row goes.
      expect(failLocalSubmission(handle, new MessageNotDeliveredError('not_sent', 'timed out'))).toBe('returned_draft');
      expect(next.state.conversation.messages).toHaveLength(0);
      expect(next.requirement).toBe('hello');
      expect(next.messageNotDelivered).toBe('not_sent');
    });

    it('adds nothing when the new conversation already has the node\'s echo of it', () => {
      const old = buildContext();
      const next = buildContext();
      next.state.conversation.messages.push({ type: 'user', text: 'hello', messageId: 'msg-1', timestamp: null });
      const handle = beginLocalUserSubmission(old, { text: 'hello', attachments: [], identity, navigationTarget: target });

      retargetLocalUserSubmissionContext(handle, next);
      expect(next.state.conversation.messages).toHaveLength(1);
    });

    it('moves a held send without a row; its acceptance shows it on the new member', () => {
      const old = buildContext();
      const next = buildContext();
      next.requirement = 'ask @Tester';
      const handle = beginLocalUserSubmission(old, { text: 'ask @Tester', attachments: [], identity, navigationTarget: target,
        mentions: [{ kind: 'agent', definitionId: 'def', name: 'Tester' }] });

      retargetLocalUserSubmissionContext(handle, next);
      expect(old.state.conversation.messages).toHaveLength(0);
      expect(next.state.conversation.messages).toHaveLength(0);

      acceptLocalSubmission(handle);
      expect(next.state.conversation.messages).toEqual([expect.objectContaining({ text: 'ask @Tester', mentionNames: ['Tester'] })]);
      expect(next.requirement).toBe('');
      expect(old.state.conversation.messages).toHaveLength(0);
    });

    it('does nothing for the context it already names', () => {
      const context = buildContext();
      const handle = beginLocalUserSubmission(context, { text: 'hello', attachments: [], identity, navigationTarget: target });
      retargetLocalUserSubmissionContext(handle, context);
      expect(context.state.conversation.messages).toHaveLength(1);
    });
  });
});
