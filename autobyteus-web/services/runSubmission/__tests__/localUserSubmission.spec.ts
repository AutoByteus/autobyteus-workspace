import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
} from '../localUserSubmission';
import { AgentStatus } from '~/types/agent/AgentStatus';

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
      occurredAt: context.state.conversation.updatedAt,
    });
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
        memberRouteKey: 'worker',
        memberRunId: 'run-1',
      },
    });

    expect(applyRunNavigationEffectMock).toHaveBeenCalledWith({
      kind: 'team_member',
      teamRunId: 'team-1',
      memberRouteKey: 'worker',
      memberRunId: 'run-1',
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
        memberRouteKey: 'worker',
        memberRunId: 'run-1',
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
      memberRouteKey: 'worker',
      summary: 'will fail',
    });
  });
});
