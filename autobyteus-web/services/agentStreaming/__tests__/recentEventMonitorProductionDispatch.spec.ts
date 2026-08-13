import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AIMessage, Conversation, UserMessage } from '~/types/conversation';
import type { AIResponseSegment, AIResponseTextSegment } from '~/types/segments';
import { AgentStreamingService } from '../AgentStreamingService';
import { dispatchAgentStreamMessage } from '../agentStreamMessageProjector';
import type { ServerMessage } from '../protocol';
import { getStreamSegmentIdentity, setStreamSegmentIdentity } from '../handlers/segmentIdentity';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import { primeRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

vi.mock('../transport', () => ({
  WebSocketClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(), on: vi.fn(), off: vi.fn(), state: 'disconnected',
  })),
  ConnectionState: {
    DISCONNECTED: 'disconnected', CONNECTING: 'connecting', CONNECTED: 'connected', DISCONNECTING: 'disconnecting',
  },
}));

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: vi.fn(),
}));

const buildContext = (runId: string): AgentContext => {
  const conversation: Conversation = {
    id: runId,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    messages: [],
  };
  return new AgentContext({} as any, new AgentRunState(runId, conversation));
};

const countVisualEvents = (context: AgentContext): number =>
  buildRecentEventMonitorPresentation(
    context.conversation,
    useAgentActivityStore().getCompactionActivities(context.state.runId),
  ).reduce((count, item) => count + (
    item.kind === 'compaction' ? 1 : item.message.type === 'user' ? 1 : item.message.segments.length
  ), 0);

const retainedStableIds = (context: AgentContext): string[] =>
  context.conversation.messages.flatMap((message) => {
    if (message.type === 'user') return [message.messageId ?? message.dedupeKey ?? `user:${message.text}`];
    return message.segments.map((segment) => {
      const identity = (segment as AIResponseSegment & {
        _streamSegmentIdentity?: { lookupKey: string | null; id: string };
      })._streamSegmentIdentity;
      if (identity) return identity.lookupKey ?? identity.id;
      if ('invocationId' in segment) return `tool:${segment.invocationId}`;
      return `${segment.type}:${JSON.stringify(segment)}`;
    });
  });

const liveMessagesForCycle = (index: number): ServerMessage[] => {
  const toolId = `tool-${index}`;
  const segmentId = `text-${index}`;
  const turnId = `turn-${index}`;
  return [
    {
      type: 'TOOL_EXECUTION_STARTED',
      payload: { invocation_id: toolId, tool_name: 'search', turn_id: turnId, arguments: { query: `query-${index}` } },
    },
    {
      type: 'TOOL_LOG',
      payload: { tool_invocation_id: toolId, tool_name: 'search', turn_id: turnId, log_entry: `detail-${index}` },
    },
    {
      type: 'TOOL_EXECUTION_SUCCEEDED',
      payload: {
        invocation_id: toolId, tool_name: 'search', turn_id: turnId,
        arguments: { query: `query-${index}` }, result: { output: `result-${index}` },
      },
    },
    { type: 'SEGMENT_START', payload: { id: segmentId, turn_id: turnId, segment_type: 'text' } },
    {
      type: 'SEGMENT_CONTENT',
      payload: { id: segmentId, turn_id: turnId, segment_type: 'text', delta: `response-${index}` },
    },
    { type: 'SEGMENT_END', payload: { id: segmentId, turn_id: turnId, segment_type: 'text' } },
    {
      type: 'EXTERNAL_USER_MESSAGE',
      payload: {
        content: `external-${index}`,
        received_at: new Date(1_800_000_000_000 + index).toISOString(),
        message_id: `external-${index}`,
      },
    },
  ] as ServerMessage[];
};

const assertBoundedUniqueState = (context: AgentContext) => {
  const activityStore = useAgentActivityStore();
  const stableIds = retainedStableIds(context);
  const activityIds = activityStore.getActivities(context.state.runId).map((activity) => activity.activityId);
  expect(countVisualEvents(context)).toBeLessThanOrEqual(100);
  expect(stableIds).toHaveLength(new Set(stableIds).size);
  expect(activityIds).toHaveLength(100);
  expect(activityIds).toHaveLength(new Set(activityIds).size);
};

const mutableText = (index: number): AIResponseTextSegment => {
  const segment: AIResponseTextSegment = { type: 'text', content: `mutable-${index}` };
  setStreamSegmentIdentity(segment, `mutable-${index}`, 'text');
  return segment;
};

const fillWithMutablePresentation = (context: AgentContext) => {
  const message: AIMessage = {
    type: 'ai', text: '', timestamp: new Date(0), isComplete: false,
    segments: Array.from({ length: 100 }, (_, index) => mutableText(index)),
  };
  context.conversation.messages.push(message);
  return message;
};

const standaloneDispatcher = () => {
  const service = new AgentStreamingService('ws://localhost:8000/ws/agent');
  return (message: ServerMessage, context: AgentContext) =>
    (service as any).dispatchMessage(message, context);
};

const teamMemberDispatcher = (message: ServerMessage, context: AgentContext) =>
  dispatchAgentStreamMessage(message, {
    kind: 'team_member', context, teamRunId: 'team-1', memberRouteKey: 'worker', memberRunId: context.state.runId,
  });

describe('recent Event Monitor production dispatch coverage', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('keeps standalone center and Activity state bounded and duplicate-free after 1,001 mixed live messages', () => {
    const context = buildContext('standalone-stress');
    const apply = standaloneDispatcher();
    const dispatch = (message: ServerMessage) => apply(message, context);
    let delivered = 0;

    for (let index = 0; index < 143; index += 1) {
      const messages = liveMessagesForCycle(index);
      const revisionBeforeLog = context.state.eventMonitorPresentationRevision;
      dispatch(messages[0]!);
      const revisionAfterStart = context.state.eventMonitorPresentationRevision;
      dispatch(messages[1]!);
      expect(context.state.eventMonitorPresentationRevision).toBe(revisionAfterStart);
      for (const message of messages.slice(2)) dispatch(message);
      delivered += messages.length;
      expect(context.state.eventMonitorPresentationRevision).toBeGreaterThanOrEqual(revisionBeforeLog);
    }

    expect(delivered).toBe(1_001);
    assertBoundedUniqueState(context);
  }, 20_000);

  it('keeps team-member center and Activity state bounded and duplicate-free after 1,001 mixed live messages', () => {
    const context = buildContext('team-member-stress');
    let delivered = 0;
    for (let index = 0; index < 143; index += 1) {
      for (const message of liveMessagesForCycle(index)) {
        teamMemberDispatcher(message, context);
        delivered += 1;
      }
    }

    expect(delivered).toBe(1_001);
    assertBoundedUniqueState(context);
  }, 20_000);

  it.each([
    ['standalone', standaloneDispatcher()],
    ['team member', teamMemberDispatcher],
  ])('keeps terminal tools in the latest-100 %s feed when interleaved reasoning receives generic ends', (_label, dispatch) => {
    const context = buildContext(`reasoning-tool-retention-${_label}`);

    for (let index = 0; index < 110; index += 1) {
      const turnId = `turn-${index}`;
      const reasoningId = `reasoning-block:test:${index}`;
      dispatch({
        type: 'SEGMENT_CONTENT',
        payload: { id: reasoningId, turn_id: turnId, segment_type: 'reasoning', delta: `thinking-${index}` },
      } as ServerMessage, context);
      dispatch({
        type: 'SEGMENT_END',
        payload: { id: reasoningId, turn_id: turnId, segment_type: 'reasoning' },
      } as ServerMessage, context);
      dispatch({
        type: 'TOOL_EXECUTION_SUCCEEDED',
        payload: {
          invocation_id: `tool-${index}`,
          turn_id: turnId,
          tool_name: 'run_bash',
          arguments: { command: `echo ${index}` },
          result: { stdout: `${index}` },
        },
      } as ServerMessage, context);
    }

    const retainedSegments = context.conversation.messages.flatMap((message) =>
      message.type === 'ai' ? message.segments : []);
    const retainedThinking = retainedSegments.filter((segment) => segment.type === 'think');
    const retainedTools = retainedSegments.filter((segment) =>
      segment.type === 'tool_call'
      || segment.type === 'terminal_command'
      || segment.type === 'edit_file'
      || segment.type === 'write_file');
    expect(retainedSegments).toHaveLength(100);
    expect(retainedThinking).toHaveLength(50);
    expect(retainedThinking.every((segment) =>
      getStreamSegmentIdentity(segment)?.presentationComplete === true)).toBe(true);
    expect(retainedTools).toHaveLength(50);
    expect(retainedTools.at(-1)).toMatchObject({ invocationId: 'tool-109', status: 'success' });
  });

  it('revises member attachment echoes only when the retained presentation changes', () => {
    const context = buildContext('team-member-attachment-echo');
    const unsupported = hydrateContextAttachment({
      locator: 'local-file://opaque/image.png',
      type: 'image',
    });
    context.conversation.messages.push({
      type: 'user',
      text: 'inspect the attachment',
      timestamp: new Date('2026-07-20T00:00:00.000Z'),
      messageId: 'member-input-attachment-1',
      dedupeKey: 'member-input:attachment-1',
      contextFilePaths: [unsupported],
    });
    primeRecentEventMonitorBaseline(context);
    const attachmentMessage = () => context.conversation.messages[0] as UserMessage;

    const dispatchEcho = (paths: Array<{ path: string; type: string }>) => {
      teamMemberDispatcher({
        type: 'MEMBER_INPUT_MESSAGE',
        payload: {
          content: 'inspect the attachment',
          received_at: '2026-07-20T00:00:01.000Z',
          message_id: 'member-input-attachment-1',
          dedupe_key: 'member-input:attachment-1',
          context_file_paths: paths,
        },
      } as ServerMessage, context);
    };

    dispatchEcho([]);
    expect(context.state.eventMonitorPresentationRevision).toBe(0);
    expect(attachmentMessage().contextFilePaths).toEqual([unsupported]);

    dispatchEcho([{ path: '/tmp/current.md', type: 'markdown' }]);
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
    expect(attachmentMessage().contextFilePaths).toMatchObject([
      { kind: 'workspace_path', locator: '/tmp/current.md', type: 'Markdown' },
      { kind: 'unsupported_local_file', locator: 'local-file://opaque/image.png', type: 'Image' },
    ]);

    dispatchEcho([{ path: '/tmp/refreshed.md', type: 'markdown' }]);
    expect(context.state.eventMonitorPresentationRevision).toBe(2);
    dispatchEcho([{ path: '/tmp/refreshed.md', type: 'markdown' }]);
    expect(context.state.eventMonitorPresentationRevision).toBe(2);

    dispatchEcho([]);
    expect(context.state.eventMonitorPresentationRevision).toBe(3);
    expect(attachmentMessage().contextFilePaths).toEqual([unsupported]);
  });

  it.each([
    ['standalone', standaloneDispatcher()],
    ['team member', teamMemberDispatcher],
  ])('does not revise the %s MP-CR-001 transient append production path', (_label, dispatch) => {
    const context = buildContext(`mp-cr-001-${_label}`);
    const originalMessage = fillWithMutablePresentation(context);
    primeRecentEventMonitorBaseline(context);

    dispatch({
      type: 'SYSTEM_TASK_NOTIFICATION',
      payload: { sender_id: 'system', content: 'transient completed event' },
    } as ServerMessage, context);

    expect(context.state.eventMonitorPresentationRevision).toBe(0);
    expect(context.conversation.messages).toEqual([originalMessage]);
    expect(countVisualEvents(context)).toBe(100);
  });

  it.each([
    ['standalone', standaloneDispatcher()],
    ['team member', teamMemberDispatcher],
  ])('keeps %s MP-AR-003 logs/results revision-neutral but revises a real tool summary', (_label, dispatch) => {
    const context = buildContext(`mp-ar-003-${_label}`);
    const tool: any = {
      type: 'tool_call', invocationId: 'tool-1', toolName: 'search', arguments: { query: 'weather' },
      status: 'success', approvalTarget: null, logs: [], result: null, error: null,
    };
    context.conversation.messages.push({
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments: [tool],
    });
    primeRecentEventMonitorBaseline(context);

    dispatch({
      type: 'TOOL_LOG',
      payload: { tool_invocation_id: 'tool-1', tool_name: 'search', turn_id: 'turn-1', log_entry: 'detail' },
    } as ServerMessage, context);
    dispatch({
      type: 'TOOL_EXECUTION_SUCCEEDED',
      payload: {
        invocation_id: 'tool-1', tool_name: 'search', turn_id: 'turn-1',
        arguments: { query: 'weather' }, result: { output: 'detail result' },
      },
    } as ServerMessage, context);
    expect(context.state.eventMonitorPresentationRevision).toBe(0);

    dispatch({
      type: 'TOOL_EXECUTION_SUCCEEDED',
      payload: {
        invocation_id: 'tool-1', tool_name: 'search', turn_id: 'turn-1',
        arguments: { query: 'forecast' }, result: { output: 'detail result' },
      },
    } as ServerMessage, context);
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
  });
});
