import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import { PendingToolInvocationEvent } from '../../../../src/agent/events/agent-events.js';

describe('AgentRuntimeState', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a non-empty agentId', () => {
    expect(() => new AgentRuntimeState('')).toThrow(/agentId/);
    expect(() => new AgentRuntimeState(null as unknown as string)).toThrow(/agentId/);
  });

  it('initializes with defaults', () => {
    const state = new AgentRuntimeState('agent-1');

    expect(state.agentId).toBe('agent-1');
    expect(state.currentStatus).toBe(AgentStatus.UNINITIALIZED);
    expect(state.pendingToolApprovals).toEqual({});
    expect(state.customData).toEqual({});
    expect(state.workspaceRootPath).toBeNull();
    expect(state.activeTurn).toBeNull();
    expect(state.todoList).toBeNull();
    expect(state.memoryManager).toBeNull();
  });

  it('accepts a workspace root path string', () => {
    const workspaceRootPath = '/tmp/workspace';
    const state = new AgentRuntimeState('agent-2', workspaceRootPath);

    expect(state.workspaceRootPath).toBe(workspaceRootPath);
  });

  it('rejects invalid workspace root path types', () => {
    expect(() => new AgentRuntimeState('agent-3', {} as unknown as string)).toThrow(/workspaceRootPath/);
    expect(() => new AgentRuntimeState('agent-3', '   ')).toThrow(/workspaceRootPath/);
  });

  it('stores and retrieves pending tool invocations', () => {
    const state = new AgentRuntimeState('agent-4');
    const invocation = new ToolInvocation('tool', { foo: 'bar' }, 'inv-1');

    state.storePendingToolInvocation(invocation);
    expect(state.pendingToolApprovals['inv-1']).toBe(invocation);

    const retrieved = state.retrievePendingToolInvocation('inv-1');
    expect(retrieved).toBe(invocation);
    expect(state.pendingToolApprovals['inv-1']).toBeUndefined();
  });

  it('handles missing pending tool invocations', () => {
    const state = new AgentRuntimeState('agent-5');

    expect(state.retrievePendingToolInvocation('missing')).toBeUndefined();
  });

  it('does not store invalid tool invocations', () => {
    const state = new AgentRuntimeState('agent-6');

    state.storePendingToolInvocation({} as ToolInvocation);

    expect(Object.keys(state.pendingToolApprovals)).toHaveLength(0);
  });

  it('makes the post-LLM idle decision explicit on runtime state', async () => {
    const state = new AgentRuntimeState('agent-7');
    state.inputEventQueues = new AgentInputEventQueueManager();

    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(true);

    state.pendingToolApprovals = { inv1: new ToolInvocation('tool', {}, 'inv1') };
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(false);

    state.pendingToolApprovals = {};
    await state.inputEventQueues.enqueueToolInvocationRequest(
      new PendingToolInvocationEvent(new ToolInvocation('tool', {}, 'inv2'))
    );
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(false);
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.AWAITING_LLM_RESPONSE)).toBe(false);
  });

  it('resolves the idle event turn id from active turn first and then the fallback', () => {
    const state = new AgentRuntimeState('agent-8');

    expect(state.resolveTurnIdForIdleEvent('turn-fallback')).toBe('turn-fallback');

    state.activeTurn = { turnId: 'turn-active' } as any;
    expect(state.resolveTurnIdForIdleEvent('turn-fallback')).toBe('turn-active');
    expect(state.resolveTurnIdForIdleEvent('   ')).toBe('turn-active');
  });

  it('renders a readable string representation', () => {
    const state = new AgentRuntimeState('agent-9');

    expect(state.toString()).toContain("agentId='agent-9'");
    expect(state.toString()).toContain("currentStatus='uninitialized'");
  });
});
