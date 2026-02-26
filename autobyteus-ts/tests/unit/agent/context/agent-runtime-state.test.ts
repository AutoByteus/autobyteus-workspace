import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { BaseAgentWorkspace } from '../../../../src/agent/workspace/base-workspace.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';

class TestWorkspace extends BaseAgentWorkspace {
  getBasePath(): string {
    return '/tmp';
  }
}

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
    expect(state.workspace).toBeNull();
    expect(state.activeToolInvocationBatch).toBeNull();
    expect(state.todoList).toBeNull();
    expect(state.memoryManager).toBeNull();
    expect(state.activeTurnId).toBeNull();
  });

  it('accepts a workspace instance', () => {
    const workspace = new TestWorkspace();
    const state = new AgentRuntimeState('agent-2', workspace);

    expect(state.workspace).toBe(workspace);
  });

  it('rejects invalid workspace types', () => {
    expect(() => new AgentRuntimeState('agent-3', {} as BaseAgentWorkspace)).toThrow(/workspace/);
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

  it('renders a readable string representation', () => {
    const state = new AgentRuntimeState('agent-7');

    expect(state.toString()).toContain("agentId='agent-7'");
    expect(state.toString()).toContain("currentStatus='uninitialized'");
  });
});
