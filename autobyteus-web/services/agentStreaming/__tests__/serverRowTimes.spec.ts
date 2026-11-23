// autobyteus-628 D-3 (REQ-004, AC-006): every time the app keeps for a conversation's rows is a time the node recorded;
// the app never stamps one from its own clock. A live turn (an own send, a platform notice, agent output, a tool call, a
// compaction, an error) with the viewer's clock 2 s behind, then 2 s ahead: each row carries the node's time, none the
// viewer's; the conversation's updatedAt is its latest row's time.
// Production: beginLocalUserSubmission, dispatchAgentStreamMessage (the live handlers), upsertPendingUserMessage (the
// standalone input state), the activity store, buildRecentEventMonitorPresentation. The viewer's clock: fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { dispatchAgentStreamMessage } from '../agentStreamMessageProjector';
import { upsertPendingUserMessage } from '../handlers/userMessageProjection';
import { beginLocalUserSubmission } from '~/services/runSubmission/localUserSubmission';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(() => true), refreshRunNavigationTopology: vi.fn(), refreshTreeQuietly: vi.fn() }),
}));

const NODE = Date.parse('2026-11-23T16:55:09.000Z');
const at = (offsetMs: number) => new Date(NODE + offsetMs).toISOString();
const RUN = 'run-628';

const buildContext = (): AgentContext => new AgentContext({
  agentDefinitionId: 'lead', agentDefinitionName: 'Lead', llmModelIdentifier: 'model', runtimeKind: 'claude_agent_sdk',
  workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, isLocked: true, llmConfig: null,
}, new AgentRunState(RUN, { id: RUN, createdAt: at(-60_000), updatedAt: at(-60_000), messages: [] }));

/** The node's frames of one turn, each with the time the node recorded (0.3-6 s after it received the message; odd ms, so
 * no frame time equals a viewer-clock time the spec could produce). */
const turnFrames = () => [
  { type: 'SYSTEM_TASK_NOTIFICATION', payload: { sender_id: 'system.skill_update_notifier', content: '[Platform notice — skill updated]', message_id: 'n1', occurred_at: at(317) } },
  { type: 'SEGMENT_START', payload: { id: 's1', turn_id: 't1', segment_type: 'text', occurred_at: at(1_023) } },
  { type: 'SEGMENT_CONTENT', payload: { id: 's1', turn_id: 't1', segment_type: 'text', delta: 'My recommendation stands.', occurred_at: at(1_131) } },
  { type: 'SEGMENT_END', payload: { id: 's1', turn_id: 't1' } },
  { type: 'TOOL_EXECUTION_STARTED', payload: { invocation_id: 'call-1', tool_name: 'run_bash', turn_id: 't1', arguments: { command: 'ls' }, occurred_at: at(2_047) } },
  { type: 'TOOL_EXECUTION_SUCCEEDED', payload: { invocation_id: 'call-1', tool_name: 'run_bash', turn_id: 't1', arguments: { command: 'ls' }, result: 'a.txt', occurred_at: at(3_061) } },
  { type: 'COMPACTION_STATUS', payload: { phase: 'completed', kind: 'context_compaction', status: 'completed', turn_id: 't1', compaction_operation_id: 'op-1', provider_timestamp: 12, occurred_at: at(4_073) } },
  { type: 'ERROR', payload: { code: 'PROVIDER_ERROR', message: 'rate limited', error_scope: 'turn', error_effect: 'diagnostic', turn_id: 't1', occurred_at: at(6_089) } },
];

const dispatch = (context: AgentContext, frames: ReturnType<typeof turnFrames>, kind: 'standalone' | 'team_member') => {
  const target = kind === 'standalone'
    ? { kind, context, runId: RUN } as const
    : { kind, context, teamRunId: 'team-1', agentRunId: RUN, memberAddress: '/lead' } as const;
  for (const frame of frames) dispatchAgentStreamMessage(frame as never, target);
};

/** Every row time the app keeps: messages, the tool Activity row, the compaction row. */
const rowTimes = (context: AgentContext) => {
  const activities = useAgentActivityStore().getActivities(RUN);
  return {
    messages: context.conversation.messages.map((message) => [message.type, message.timestamp?.toISOString() ?? null]),
    tool: activities.find((activity) => activity.kind === 'tool')?.timestamp.toISOString() ?? null,
    compaction: activities.find((activity) => activity.kind === 'compaction')?.centerTimelineTimestamp?.toISOString() ?? null,
    updatedAt: context.conversation.updatedAt,
  };
};

describe('every row time is the node\'s (autobyteus-628 D-3)', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it.each([
    ['2 s behind', -2_000],
    ['2 s ahead', 2_000],
  ])('a Team member\'s turn with the viewer %s: the own send is untimed until its echo, then every row has the node\'s time', (_case, viewerOffsetMs) => {
    const context = buildContext();
    vi.setSystemTime(NODE + viewerOffsetMs);
    const handle = beginLocalUserSubmission(context, { text: 'You mean …?', attachments: [], identity: { messageId: 'client_b', dedupeKey: 'member_input:b' },
      navigationTarget: { kind: 'team_member', teamRunId: 'team-1', agentRunId: RUN, memberAddress: '/lead' } } as never);
    expect(handle.message.timestamp).toBeNull();
    expect(context.conversation.updatedAt).toBe(at(-60_000));

    // The node's echo of the send, with its receipt time.
    dispatch(context, [{ type: 'MEMBER_INPUT_MESSAGE', payload: { message_id: 'client_b', dedupe_key: 'member_input:b', content: 'You mean …?',
      input_origin: 'user_message', received_at: at(0), context_file_paths: [], recipient_agent_run_id: RUN } } as never], 'team_member');
    vi.setSystemTime(NODE + 300 + viewerOffsetMs);
    dispatch(context, turnFrames(), 'team_member');

    const times = rowTimes(context);
    expect(times.messages).toEqual([['user', at(0)], ['ai', at(317)]]);
    expect(times.tool).toBe(at(2_047));
    expect(times.compaction).toBe(at(4_073));
    expect(times.updatedAt).toBe(at(317));
    // No row carries the viewer's clock.
    const viewerTimes = new Set([at(viewerOffsetMs), at(300 + viewerOffsetMs)]);
    expect([...times.messages.map(([, time]) => time), times.tool, times.compaction].filter((time) => viewerTimes.has(time as string))).toEqual([]);
    // The window shows them in the conversation's order.
    expect(buildRecentEventMonitorPresentation(context.conversation, useAgentActivityStore().getCompactionActivities(RUN)).map((item) => item.kind))
      // You, the notice, the agent's message (text, tool call, error), then the compaction, placed by its server time.
      .toEqual(['message', 'notice', 'message', 'compaction']);
  });

  it('a standalone own send (no echo on /ws/agent) takes its time from the input state\'s accepted_at, live (ARCH-REV-002 N-1)', () => {
    const context = buildContext();
    vi.setSystemTime(NODE - 2_000);
    const handle = beginLocalUserSubmission(context, { text: 'Go on.', attachments: [], identity: { messageId: 'client_s', dedupeKey: 'client_s' },
      navigationTarget: { kind: 'standalone', runId: RUN } } as never);
    expect(handle.message.timestamp).toBeNull();
    upsertPendingUserMessage(context, { sequence: 1, message_id: 'client_s', dedupe_key: 'client_s', turn_id: null, state: 'forwarded',
      content: 'Go on.', sender_type: 'user', file_attachments: [], accepted_at: at(0) }, 'instance-1');
    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0]!.timestamp?.toISOString()).toBe(at(0));
    // A later input-state revision keeps the time already shown.
    upsertPendingUserMessage(context, { sequence: 1, message_id: 'client_s', dedupe_key: 'client_s', turn_id: 't9', state: 'forwarded',
      content: 'Go on.', sender_type: 'user', file_attachments: [], accepted_at: at(5_000) }, 'instance-1');
    expect(context.conversation.messages[0]!.timestamp?.toISOString()).toBe(at(0));

    dispatch(context, turnFrames(), 'standalone');
    expect(rowTimes(context).messages).toEqual([['user', at(0)], ['ai', at(317)]]);
  });

  it('a message frame without the node\'s time is refused at the boundary, never shown with the viewer\'s clock', async () => {
    const { parseServerMessage } = await import('../protocol/messageParser');
    expect(() => parseServerMessage(JSON.stringify({ type: 'SEGMENT_START', payload: { id: 's1', turn_id: 't1', segment_type: 'text' } })))
      .toThrow(/occurred_at/);
    expect(() => parseServerMessage(JSON.stringify({ type: 'TOOL_EXECUTION_STARTED', payload: { invocation_id: 'c', tool_name: 'x', turn_id: 't1' } })))
      .toThrow(/occurred_at/);
  });
});
