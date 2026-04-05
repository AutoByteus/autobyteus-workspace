import { describe, it, expect } from 'vitest';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocationBatch } from '../../../src/agent/tool-invocation-batch.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';

describe('ToolInvocation', () => {
  it('validates required fields', () => {
    expect(() => new ToolInvocation('', {}, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', null as any, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', {}, '')).toThrow();
  });

  it('reports valid invocations', () => {
    const invocation = new ToolInvocation('tool', { a: 1 }, 'id', 'turn_0001');
    expect(invocation.isValid()).toBe(true);
    expect(invocation.turnId).toBe('turn_0001');
  });
});

describe('ToolInvocationBatch', () => {
  it('tracks completion based on settled invocation results', () => {
    const invocation = new ToolInvocation('tool', {}, 'id', 'turn_0001');
    const batch = new ToolInvocationBatch('turn_0001', [invocation]);
    expect(batch.isComplete()).toBe(false);
    expect(batch.settleResult(new ToolResultEvent('tool', 'ok', 'id', undefined, undefined, 'turn_0001'))).toBe(true);
    expect(batch.isComplete()).toBe(true);
  });

  it('rejects results from a different agent turn', () => {
    const invocation = new ToolInvocation('tool', {}, 'id', 'turn_0001');
    const batch = new ToolInvocationBatch('turn_0001', [invocation]);
    expect(batch.settleResult(new ToolResultEvent('tool', 'ok', 'id', undefined, undefined, 'turn_0002'))).toBe(false);
    expect(batch.isComplete()).toBe(false);
  });
});

describe('AgentTurn', () => {
  it('assigns its agent turn id to started tool batches', () => {
    const turn = new AgentTurn('turn_0007');
    const invocation = new ToolInvocation('tool', {}, 'id');

    const batch = turn.startToolInvocationBatch([invocation]);

    expect(invocation.turnId).toBe('turn_0007');
    expect(batch.turnId).toBe('turn_0007');
    expect(turn.activeToolInvocationBatch).toBe(batch);
    expect(turn.toolInvocationBatches).toEqual([batch]);
  });
});
