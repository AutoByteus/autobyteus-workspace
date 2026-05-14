import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ToolExecutionApprovalEvent, ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryStore } from '../../../../src/memory/store/base-store.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

class InMemoryStore extends MemoryStore {
  private items: any[] = [];

  add(items: Iterable<any>): void {
    for (const item of items) {
      this.items.push(item);
    }
  }

  list(memoryType: MemoryType, limit?: number): any[] {
    const filtered = this.items.filter((item) => item?.memoryType === memoryType);
    return typeof limit === 'number' ? filtered.slice(-limit) : filtered;
  }

  listRawTracesOrdered(limit?: number): any[] {
    return this.list(MemoryType.RAW_TRACE, limit);
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>): void {
    const ids = new Set(Array.from(traceIdsToRemove));
    this.items = this.items.filter((item) => item?.memoryType !== MemoryType.RAW_TRACE || !ids.has(item.id));
  }
}

const attachMemoryManager = (state: AgentRuntimeState, turnId = 'turn-test'): void => {
  state.memoryManager = {
    startTurn: () => turnId,
    createWorkingContextTurnCheckpoint: (id: string) => ({ turnId: id, messages: [], lastCompactionTs: null }),
    restoreWorkingContextTurnCheckpoint: vi.fn()
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
      startTurn: () => 'turn-1',
      createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
      restoreWorkingContextTurnCheckpoint: vi.fn()
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

  it('restores the turn-start working context checkpoint for interrupted turns', () => {
    const state = new AgentRuntimeState('agent-checkpoint');
    const memoryManager = new MemoryManager({ store: new InMemoryStore() });
    memoryManager.workingContextSnapshot.appendMessage(
      new Message(MessageRole.SYSTEM, { content: 'stable system prompt' })
    );
    state.memoryManager = memoryManager;

    const activeTurn = state.startActiveTurn('turn-restore');
    memoryManager.workingContextSnapshot.appendMessage(
      new Message(MessageRole.USER, { content: 'interrupted user input' })
    );
    memoryManager.ingestToolIntents(
      [new ToolInvocation('read_file', { path: '/tmp/incomplete.txt' }, 'inv-restore')],
      activeTurn.turnId
    );

    expect(memoryManager.getWorkingContextMessages()).toHaveLength(3);
    expect(state.restoreWorkingContextForInterruptedTurn(activeTurn.turnId)).toBe(true);

    const messages = memoryManager.getWorkingContextMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe(MessageRole.SYSTEM);
    expect(messages[0].content).toBe('stable system prompt');
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
      startTurn: () => 'turn-1',
      createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
      restoreWorkingContextTurnCheckpoint: vi.fn()
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
      startTurn: () => 'turn-1',
      createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
      restoreWorkingContextTurnCheckpoint: vi.fn()
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
