import { describe, expect, it } from 'vitest';
import { CompactionWindowPlanner } from '../../../src/memory/compaction/compaction-window-planner.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { buildToolCallContextIndex, buildToolTraceLifecycleIndex } from '../../../src/memory/tool-trace-lifecycle-index.js';

const makeTrace = (options: {
  id: string;
  turnId: string;
  seq: number;
  traceType: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  toolError?: string | null;
}) => new RawTraceItem({
  id: options.id,
  ts: Date.now() / 1000,
  turnId: options.turnId,
  seq: options.seq,
  traceType: options.traceType,
  content: options.content ?? '',
  sourceEvent: 'test',
  toolCallId: options.toolCallId ?? null,
  toolName: options.toolName ?? null,
  toolArgs: options.toolArgs,
  ...(Object.prototype.hasOwnProperty.call(options, 'toolResult') ? { toolResult: options.toolResult } : {}),
  ...(Object.prototype.hasOwnProperty.call(options, 'toolError') ? { toolError: options.toolError } : {}),
});

describe('CompactionWindowPlanner', () => {
  it('splits same-turn continuation cycles and keeps the unresolved suffix raw', () => {
    const planner = new CompactionWindowPlanner();
    const rawTraces = [
      makeTrace({ id: 'rt1', turnId: 'turn_0002', seq: 1, traceType: 'user', content: 'first cycle' }),
      makeTrace({ id: 'rt2', turnId: 'turn_0002', seq: 2, traceType: 'assistant', content: 'ack' }),
      makeTrace({ id: 'rt3', turnId: 'turn_0002', seq: 3, traceType: 'tool_call', toolCallId: 'call_1', toolName: 'run_tests' }),
      makeTrace({ id: 'rt4', turnId: 'turn_0002', seq: 4, traceType: 'tool_result', toolCallId: 'call_1', content: '3 failures' }),
      makeTrace({ id: 'rt5', turnId: 'turn_0002', seq: 5, traceType: 'tool_continuation', content: 'continue' }),
      makeTrace({ id: 'rt6', turnId: 'turn_0002', seq: 6, traceType: 'assistant', content: 'second cycle ack' }),
      makeTrace({ id: 'rt7', turnId: 'turn_0002', seq: 7, traceType: 'tool_call', toolCallId: 'call_2', toolName: 'write_file' }),
    ];

    const plan = planner.plan({ activeRawTraces: rawTraces, activeTurnId: 'turn_0002' });

    expect(plan.eligibleBlocks).toHaveLength(1);
    expect(plan.frontierBlocks).toHaveLength(1);
    expect(plan.eligibleTraceIds).toEqual(['rt1', 'rt2', 'rt3', 'rt4']);
    expect(plan.frontierTraceIds).toEqual(['rt5', 'rt6', 'rt7']);
    expect(plan.eligibleBlocks[0]?.toolResultDigests).toMatchObject([
      {
        traceId: 'rt4',
        toolCallId: 'call_1',
        toolName: 'run_tests',
        status: 'success',
      }
    ]);
  });

  it('keeps the final complete block as frontier during conservative bootstrap fallback', () => {
    const planner = new CompactionWindowPlanner();
    const rawTraces = [
      makeTrace({ id: 'rt1', turnId: 'turn_0001', seq: 1, traceType: 'user', content: 'older' }),
      makeTrace({ id: 'rt2', turnId: 'turn_0001', seq: 2, traceType: 'assistant', content: 'older ack' }),
      makeTrace({ id: 'rt3', turnId: 'turn_0002', seq: 1, traceType: 'user', content: 'latest' }),
      makeTrace({ id: 'rt4', turnId: 'turn_0002', seq: 2, traceType: 'assistant', content: 'latest ack' }),
    ];

    const plan = planner.plan({ activeRawTraces: rawTraces });

    expect(plan.eligibleBlocks).toHaveLength(1);
    expect(plan.frontierBlocks).toHaveLength(1);
    expect(plan.frontierBlocks[0]?.traceIds).toEqual(['rt3', 'rt4']);
  });

  it('uses archived call context for an active minimal result without exposing archive ids to pruning', () => {
    const planner = new CompactionWindowPlanner();
    const archivedCall = makeTrace({
      id: 'archive-call', turnId: 'turn_1', seq: 1, traceType: 'tool_call',
      toolCallId: 'call_1', toolName: 'run_bash', toolArgs: { command: 'pwd' },
    });
    const activeRawTraces = [
      makeTrace({ id: 'rt1', turnId: 'turn_1', seq: 1, traceType: 'user', content: 'run it' }),
      makeTrace({
        id: 'rt2', turnId: 'turn_1', seq: 2, traceType: 'tool_result', toolCallId: 'call_1',
        toolResult: '/tmp', toolError: null,
      }),
      makeTrace({ id: 'rt3', turnId: 'turn_2', seq: 1, traceType: 'user', content: 'later' }),
      makeTrace({ id: 'rt4', turnId: 'turn_2', seq: 2, traceType: 'assistant', content: 'ok' }),
    ];

    const callContextByIdentity = buildToolCallContextIndex(
      buildToolTraceLifecycleIndex([archivedCall, ...activeRawTraces]),
    );
    const plan = planner.plan({ activeRawTraces, activeTurnId: 'turn_2', callContextByIdentity });
    expect(plan.eligibleTraceIds).toEqual(['rt1', 'rt2']);
    expect([...plan.eligibleTraceIds, ...plan.frontierTraceIds]).not.toContain('archive-call');
    expect(plan.eligibleBlocks[0]).toMatchObject({
      isStructurallyComplete: true,
      toolCallIds: ['call_1'],
      matchedToolCallIds: ['call_1'],
    });
    expect(plan.eligibleBlocks[0]?.toolResultDigests[0]).toMatchObject({
      traceId: 'rt2', status: 'success', toolName: 'run_bash',
    });
  });
});
