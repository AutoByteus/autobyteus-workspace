import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ToolExecutionApprovalEvent, ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';

const attachMemoryManager = (state: AgentRuntimeState, turnId = 'turn-test'): void => {
  state.memoryManager = {
    startTurn: () => turnId
  } as any;
};

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
    attachMemoryManager(state, 'turn-pending');
    const activeTurn = state.startActiveTurn('turn-pending');
    const invocation = new ToolInvocation('tool', { foo: 'bar' }, 'inv-1', activeTurn.turnId);

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

  it('makes the post-LLM idle decision explicit on runtime state', () => {
    const state = new AgentRuntimeState('agent-7');

    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(true);

    attachMemoryManager(state, 'turn-idle');
    const activeTurn = state.startActiveTurn('turn-idle');
    state.storePendingToolInvocation(new ToolInvocation('tool', {}, 'inv1', activeTurn.turnId));
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(false);

    state.clearPendingToolApprovalsForTurn(activeTurn.turnId);
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.ANALYZING_LLM_RESPONSE)).toBe(true);
    expect(state.shouldEnterIdleAfterLlmResponse(AgentStatus.AWAITING_LLM_RESPONSE)).toBe(false);
  });

  it('interrupts the active turn and fences pending approvals for that turn', () => {
    const state = new AgentRuntimeState('agent-8');
    state.memoryManager = {
      startTurn: () => 'turn-1'
    } as any;
    const activeTurn = state.startActiveTurn();
    const invocation = new ToolInvocation('tool', {}, 'inv-1');
    invocation.turnId = activeTurn.turnId;
    state.storePendingToolInvocation(invocation);

    const result = state.interruptActiveTurn('user_interrupt');

    expect(result.accepted).toBe(true);
    expect(result.status).toBe('accepted');
    expect(activeTurn.executionScope.signal.aborted).toBe(true);
    expect(state.pendingToolApprovals).toEqual({});
  });

  it('only clears a matching active turn after the turn has settled', () => {
    const state = new AgentRuntimeState('agent-clear-settled');
    attachMemoryManager(state, 'turn-live');
    const activeTurn = state.startActiveTurn('turn-live');

    expect(state.clearSettledActiveTurnIfStillActive(activeTurn.turnId)).toBeNull();
    expect(state.activeTurn).toBe(activeTurn);

    activeTurn.settle({ kind: 'completed', turnId: activeTurn.turnId });

    expect(state.clearSettledActiveTurnIfStillActive('other-turn')).toBeNull();
    expect(state.activeTurn).toBe(activeTurn);
    expect(state.clearSettledActiveTurnIfStillActive(activeTurn.turnId)).toBe(activeTurn.turnId);
    expect(state.activeTurn).toBeNull();
  });

  it('resolves the idle event turn id from active turn first and then the fallback', () => {
    const state = new AgentRuntimeState('agent-9');

    expect(state.resolveTurnIdForIdleEvent('turn-fallback')).toBe('turn-fallback');

    state.activeTurn = { turnId: 'turn-active' } as any;
    expect(state.resolveTurnIdForIdleEvent('turn-fallback')).toBe('turn-active');
    expect(state.resolveTurnIdForIdleEvent('   ')).toBe('turn-active');
  });


  it('validates pending approvals through the active turn TurnToolInputPort only when approval is pending', async () => {
    const state = new AgentRuntimeState('agent-approval');
    state.memoryManager = {
      startTurn: () => 'turn-1'
    } as any;
    const activeTurn = state.startActiveTurn('turn-1');
    activeTurn.startToolInvocationBatch([new ToolInvocation('tool', {}, 'inv-approval', 'turn-1')]);

    const autoExecuteResult = state.routeToolApprovalToActiveTurn(new ToolExecutionApprovalEvent('inv-approval', true, undefined, 'turn-1'));
    expect(autoExecuteResult.accepted).toBe(false);
    expect(autoExecuteResult.code).toBe('no_pending_invocation');

    state.storePendingToolInvocation(new ToolInvocation('tool', {}, 'inv-approval', 'turn-1'));
    const waitPromise = activeTurn.toolInputPort.waitForApproval('inv-approval', {
      signal: activeTurn.executionScope.signal
    });
    const posted = state.routeToolApprovalToActiveTurn(new ToolExecutionApprovalEvent('inv-approval', true, undefined, 'turn-1'));

    expect(posted).toEqual({ accepted: true, code: 'posted', turnId: 'turn-1', invocationId: 'inv-approval' });
    await expect(waitPromise).resolves.toMatchObject({ isApproved: true, toolInvocationId: 'inv-approval' });
  });

  it('validates external tool results through the active turn TurnToolInputPort', async () => {
    const state = new AgentRuntimeState('agent-result');
    state.memoryManager = {
      startTurn: () => 'turn-1'
    } as any;
    const activeTurn = state.startActiveTurn('turn-1');

    const noPending = state.routeToolResultToActiveTurn(new ToolResultEvent('tool', { ok: true }, 'inv-result', undefined, undefined, 'turn-1'));
    expect(noPending.accepted).toBe(false);
    expect(noPending.code).toBe('no_pending_invocation');

    activeTurn.startToolInvocationBatch([new ToolInvocation('tool', {}, 'inv-result', 'turn-1')]);
    const noConsumer = state.routeToolResultToActiveTurn(new ToolResultEvent('tool', { ok: true }, 'inv-result', undefined, undefined, 'turn-1'));
    expect(noConsumer.accepted).toBe(false);
    expect(noConsumer.code).toBe('no_result_consumer');

    const waitPromise = activeTurn.toolInputPort.waitForToolResult('inv-result', {
      signal: activeTurn.executionScope.signal
    });
    const posted = state.routeToolResultToActiveTurn(new ToolResultEvent('tool', { ok: true }, 'inv-result', undefined, undefined, 'turn-1'));

    expect(posted).toEqual({ accepted: true, code: 'posted', turnId: 'turn-1', invocationId: 'inv-result' });
    await expect(waitPromise).resolves.toMatchObject({
      toolInvocationId: 'inv-result',
      toolName: 'tool',
      result: { ok: true }
    });
  });

  it('renders a readable string representation', () => {
    const state = new AgentRuntimeState('agent-10');

    expect(state.toString()).toContain("agentId='agent-10'");
    expect(state.toString()).toContain("currentStatus='uninitialized'");
  });
});
