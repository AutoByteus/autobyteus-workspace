import { describe, expect, it } from 'vitest';
import type { RecentEventMonitorPresentationItem } from '../recentEventMonitorWindow';
import {
  areRecentEventMonitorPresentationWitnessesEqual,
  buildRecentEventMonitorPresentationWitness,
} from '../recentEventMonitorPresentationWitness';

const toolLifecycle = {
  approvalTarget: null,
  logs: [],
  result: null,
  error: null,
};

const buildItems = (): RecentEventMonitorPresentationItem[] => [{
  kind: 'message',
  key: 'user-1',
  messageIndex: 0,
  message: {
    type: 'user',
    text: 'hello',
    timestamp: new Date(1),
    messageId: 'user-1',
    promptTokens: 3,
    promptCost: 0.001,
    contextFilePaths: [{
      kind: 'workspace_path',
      id: 'attachment-1',
      locator: '/workspace/a.png',
      displayName: 'a.png',
      type: 'Image',
    }],
  },
}, {
  kind: 'message',
  key: 'ai-1',
  messageIndex: 1,
  message: {
    type: 'ai',
    text: '',
    timestamp: new Date(2),
    isComplete: false,
    completionTokens: 7,
    completionCost: 0.002,
    segments: [
      { type: 'text', content: 'answer' },
      { type: 'think', content: 'reasoning' },
      {
        type: 'tool_call', invocationId: 'tool-1', toolName: 'search', arguments: { query: 'weather' },
        status: 'awaiting-approval', approvalTarget: { memberRouteKey: 'member-a', memberPath: ['root', 'member-a'] },
        logs: [], result: null, error: null,
      },
      {
        type: 'terminal_command', invocationId: 'terminal-1', toolName: '', arguments: {}, status: 'success',
        command: 'pwd', description: 'working directory', ...toolLifecycle,
      },
      {
        type: 'write_file', invocationId: 'write-1', toolName: '', arguments: {}, status: 'success',
        path: '/workspace/out.txt', originalContent: 'hidden', language: 'text', ...toolLifecycle,
      },
      {
        type: 'edit_file', invocationId: 'edit-1', toolName: '', arguments: {}, status: 'success',
        path: '/workspace/edit.txt', originalContent: 'hidden patch', language: 'text', ...toolLifecycle,
      },
      { type: 'system_task_notification', senderId: 'hidden-sender', content: 'task ready' },
      {
        type: 'inter_agent_message', messageId: 'inter-1', senderAgentRunId: 'sender-1',
        recipientRoleName: 'Reviewer', messageType: 'handoff', content: 'please review',
      },
      { type: 'media', mediaType: 'image', urls: ['https://example/a.png', 'https://example/b.png'] },
      { type: 'error', source: 'hidden-source', message: 'failed', details: 'details' },
    ],
  },
}, {
  kind: 'compaction',
  key: 'compaction-1',
  activity: {
    kind: 'compaction', activityId: 'compaction-1', phase: 'started', message: 'Compacting memory…',
    turnId: 'turn-1', rawTraceCount: 12, semanticFactCount: 4, provider: 'codex',
    timestamp: new Date(3), updatedAt: new Date(3), centerTimelineTimestamp: new Date(3),
  },
}];

const witness = (items: RecentEventMonitorPresentationItem[]) =>
  buildRecentEventMonitorPresentationWitness(items);

const aiSegments = (items: RecentEventMonitorPresentationItem[]): any[] =>
  (items[1] as Extract<RecentEventMonitorPresentationItem, { kind: 'message' }>).message.type === 'ai'
    ? (items[1] as any).message.segments
    : [];

describe('recent Event Monitor presentation witness', () => {
  it('covers every central visual kind in exact presentation order with retained usage', () => {
    const result = witness(buildItems());

    expect(result.tokens.map((token) => token.kind)).toEqual([
      'user', 'text', 'think', 'tool_call', 'terminal_command', 'write_file', 'edit_file',
      'system_task_notification', 'inter_agent_message', 'media', 'error', 'compaction',
    ]);
    expect(result.tokens).toHaveLength(12);
    expect(result.tokens[0]?.values.at(-1)).toBe('3 tokens / $0.0010');
    expect(result.tokens[10]?.values.at(-1)).toBe('7 tokens / $0.0020');
    expect(result.totalUsageText).toBe('Total: 10 tokens / $0.0030');
  });

  it.each([
    ['user text', (items: any[]) => { items[0].message.text = 'changed'; }],
    ['attachment identity', (items: any[]) => { items[0].message.contextFilePaths[0].id = 'attachment-2'; }],
    ['attachment kind', (items: any[]) => { items[0].message.contextFilePaths[0].kind = 'external_url'; }],
    ['attachment locator', (items: any[]) => { items[0].message.contextFilePaths[0].locator = 'https://example/b.png'; }],
    ['attachment label', (items: any[]) => { items[0].message.contextFilePaths[0].displayName = 'b.png'; }],
    ['attachment type', (items: any[]) => { items[0].message.contextFilePaths[0].type = 'Pdf'; }],
    ['text content', (items: any[]) => { aiSegments(items)[0].content = 'changed'; }],
    ['thinking content', (items: any[]) => { aiSegments(items)[1].content = 'changed'; }],
    ['tool summary', (items: any[]) => { aiSegments(items)[2].arguments.query = 'forecast'; }],
    ['tool status', (items: any[]) => { aiSegments(items)[2].status = 'approved'; }],
    ['tool error', (items: any[]) => { aiSegments(items)[2].error = 'visible error'; }],
    ['tool approval target', (items: any[]) => { aiSegments(items)[2].approvalTarget.memberPath[1] = 'member-b'; }],
    ['terminal command', (items: any[]) => { aiSegments(items)[3].command = 'ls'; }],
    ['write path', (items: any[]) => { aiSegments(items)[4].path = '/workspace/new.txt'; }],
    ['edit path', (items: any[]) => { aiSegments(items)[5].path = '/workspace/new-edit.txt'; }],
    ['system notification', (items: any[]) => { aiSegments(items)[6].content = 'changed'; }],
    ['inter-agent sender', (items: any[]) => { aiSegments(items)[7].senderAgentRunId = 'sender-2'; }],
    ['inter-agent content', (items: any[]) => { aiSegments(items)[7].content = 'changed'; }],
    ['inter-agent type', (items: any[]) => { aiSegments(items)[7].messageType = 'reply'; }],
    ['inter-agent recipient', (items: any[]) => { aiSegments(items)[7].recipientRoleName = 'Writer'; }],
    ['media type', (items: any[]) => { aiSegments(items)[8].mediaType = 'video'; }],
    ['media URL order', (items: any[]) => { aiSegments(items)[8].urls.reverse(); }],
    ['error message', (items: any[]) => { aiSegments(items)[9].message = 'changed'; }],
    ['error details', (items: any[]) => { aiSegments(items)[9].details = 'changed'; }],
    ['row usage', (items: any[]) => { items[1].message.completionCost = 0.003; }],
    ['compaction phase', (items: any[]) => { items[2].activity.phase = 'completed'; }],
    ['compaction message', (items: any[]) => { items[2].activity.message = 'Done'; }],
    ['compaction turn', (items: any[]) => { items[2].activity.turnId = 'turn-2'; }],
    ['compaction raw traces', (items: any[]) => { items[2].activity.rawTraceCount = 13; }],
    ['compaction facts', (items: any[]) => { items[2].activity.semanticFactCount = 5; }],
    ['compaction provider', (items: any[]) => { items[2].activity.provider = 'claude'; }],
  ])('detects a rendered or retained-interaction change in %s', (_label, mutate) => {
    const beforeItems = buildItems();
    const afterItems = buildItems();
    mutate(afterItems as any[]);
    expect(areRecentEventMonitorPresentationWitnessesEqual(witness(beforeItems), witness(afterItems))).toBe(false);
  });

  it('ignores Activity-only tool detail and other explicitly non-rendered fields', () => {
    const beforeItems = buildItems();
    const afterItems = buildItems();
    const segments = aiSegments(afterItems);
    segments[2].logs.push('Activity-only log');
    segments[2].result = { output: 'Activity-only result' };
    segments[2].rawContent = 'not rendered';
    segments[3].description = 'not rendered';
    segments[4].originalContent = 'not rendered';
    segments[4].language = 'markdown';
    segments[5].originalContent = 'not rendered';
    segments[6].senderId = 'not rendered';
    segments[9].source = 'not rendered';
    (afterItems[1] as any).message.isComplete = true;
    (afterItems[2] as any).activity.updatedAt = new Date(999);
    (afterItems[2] as any).activity.errorMessage = 'not rendered separately';

    expect(areRecentEventMonitorPresentationWitnessesEqual(witness(beforeItems), witness(afterItems))).toBe(true);
  });

  it('treats equal semantic object replacement as equal and detects membership/order changes', () => {
    const beforeItems = buildItems();
    const equalItems = buildItems();
    const replacement = { ...aiSegments(equalItems)[2], arguments: { query: 'weather' } };
    aiSegments(equalItems)[2] = replacement;
    expect(areRecentEventMonitorPresentationWitnessesEqual(witness(beforeItems), witness(equalItems))).toBe(true);

    const reorderedItems = buildItems();
    const segments = aiSegments(reorderedItems);
    [segments[0], segments[1]] = [segments[1], segments[0]];
    expect(areRecentEventMonitorPresentationWitnessesEqual(witness(beforeItems), witness(reorderedItems))).toBe(false);
  });

  it('does not recursively traverse unused arguments, results, or logs', () => {
    const items = buildItems();
    const tool = aiSegments(items)[2];
    Object.defineProperty(tool.arguments, 'unused', { get: () => { throw new Error('unused argument read'); } });
    Object.defineProperty(tool, 'result', { get: () => { throw new Error('result read'); } });
    Object.defineProperty(tool, 'logs', { get: () => { throw new Error('logs read'); } });

    expect(() => witness(items)).not.toThrow();
  });
});
