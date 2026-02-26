import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgentWorkspace } from '../../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../../src/agent/workspace/workspace-config.js';

class TestWorkspace extends BaseAgentWorkspace {
  getBasePath(): string {
    return '/tmp';
  }
}

describe('BaseAgentWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default config and workspace id', () => {
    const workspace = new TestWorkspace();

    expect(workspace.config).toBeInstanceOf(WorkspaceConfig);
    expect(workspace.workspaceId).toBeTruthy();
    expect(workspace.agentId).toBeNull();
  });

  it('uses provided config', () => {
    const config = new WorkspaceConfig({ path: '/data' });
    const workspace = new TestWorkspace(config);

    expect(workspace.config).toBe(config);
  });

  it('uses workspaceId from config when provided', () => {
    const config = new WorkspaceConfig({ workspaceId: 'custom_ws' });
    const workspace = new TestWorkspace(config);

    expect(workspace.workspaceId).toBe('custom_ws');
  });


  it('sets context and exposes agentId', () => {
    const workspace = new TestWorkspace();
    const context = { agentId: 'agent-123' };

    workspace.setContext(context);

    expect(workspace.agentId).toBe('agent-123');
  });

  it('warns when overwriting context', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const workspace = new TestWorkspace();

    workspace.setContext({ agentId: 'agent-1' });
    workspace.setContext({ agentId: 'agent-2' });

    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('returns workspace name as workspace id by default', () => {
    const workspace = new TestWorkspace();

    expect(workspace.getName()).toBe(workspace.workspaceId);
  });

  it('renders a readable string representation', () => {
    const workspace = new TestWorkspace();
    workspace.setContext({ agentId: 'agent-42' });

    expect(workspace.toString()).toBe(
      `<TestWorkspace workspaceId='${workspace.workspaceId}' agentId='agent-42'>`
    );
  });
});
