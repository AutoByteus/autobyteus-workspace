import { describe, expect, it } from 'vitest';
import { CompactionWindowPlanner } from '../../../src/memory/compaction/compaction-window-planner.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';

const makeTrace = (options: {
  id: string;
  turnId: string;
  seq: number;
  traceType: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
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
});

describe('CompactionWindowPlanner', () => {
  it('splits same-turn continuation cycles and keeps the unresolved suffix raw', () => {
    const planner = new CompactionWindowPlanner();
    const rawTraces = [
      makeTrace({ id: 'rt1', turnId: 'turn_0002', seq: 1, traceType: 'user', content: 'first cycle' }),
      makeTrace({ id: 'rt2', turnId: 'turn_0002', seq: 2, traceType: 'assistant', content: 'ack' }),
      makeTrace({ id: 'rt3', turnId: 'turn_0002', seq: 3, traceType: 'tool_call', toolCallId: 'call_1', toolName: 'run_tests' }),
      makeTrace({ id: 'rt4', turnId: 'turn_0002', seq: 4, traceType: 'tool_result', toolCallId: 'call_1', toolName: 'run_tests', content: '3 failures' }),
      makeTrace({ id: 'rt5', turnId: 'turn_0002', seq: 5, traceType: 'tool_continuation', content: 'continue' }),
      makeTrace({ id: 'rt6', turnId: 'turn_0002', seq: 6, traceType: 'assistant', content: 'second cycle ack' }),
      makeTrace({ id: 'rt7', turnId: 'turn_0002', seq: 7, traceType: 'tool_call', toolCallId: 'call_2', toolName: 'write_file' }),
    ];

    const plan = planner.plan(rawTraces, 'turn_0002');

    expect(plan.eligibleBlocks).toHaveLength(1);
    expect(plan.frontierBlocks).toHaveLength(1);
    expect(plan.eligibleTraceIds).toEqual(['rt1', 'rt2', 'rt3', 'rt4']);
    expect(plan.frontierTraceIds).toEqual(['rt5', 'rt6', 'rt7']);
    expect(plan.eligibleBlocks[0]?.toolResultDigests).toMatchObject([
      {
        traceId: 'rt4',
        toolCallId: 'call_1',
        toolName: 'run_tests',
        status: 'unknown',
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

    const plan = planner.plan(rawTraces, null);

    expect(plan.eligibleBlocks).toHaveLength(1);
    expect(plan.frontierBlocks).toHaveLength(1);
    expect(plan.frontierBlocks[0]?.traceIds).toEqual(['rt3', 'rt4']);
  });
});
