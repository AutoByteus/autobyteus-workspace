import { describe, expect, it, vi } from 'vitest';
import { ClaudeSessionCleanup } from '../../../../../../src/agent-execution/backends/claude/session/claude-session-cleanup.js';

describe('independent concrete Claude component cleanup receipts', () => {
  it('continues independent listener/skill/MCP cleanup after process failure; retry touches only the failed exact process', async () => {
    let failProcess = true;
    const protectedRun = { closeProcess: vi.fn() };
    const session = { closeProcess: vi.fn(async () => { if (failProcess) throw new Error('physical exit unavailable'); }),
      closeTurnForTermination: vi.fn(async () => undefined),
      clearRuntimeListeners: vi.fn(), releaseAgentToolsMcp: vi.fn(),
      runContext: { runtimeContext: { requireWorkspaceSkills: () => skills } } };
    // The run's workspace skill holder: its release is the run's only release of its links.
    const skills = { release: vi.fn(async () => undefined) };
    const cleanup = new ClaudeSessionCleanup();
    await expect(cleanup.cleanupSessionResources({ session: session as never })).rejects.toThrow('exact component cleanup failed');
    expect(session.clearRuntimeListeners).toHaveBeenCalledOnce();
    expect(session.closeTurnForTermination).toHaveBeenCalledOnce();
    expect(skills.release).toHaveBeenCalledOnce();
    expect(session.releaseAgentToolsMcp).toHaveBeenCalledOnce();
    failProcess = false;
    await cleanup.cleanupSessionResources({ session: session as never });
    await cleanup.cleanupSessionResources({ session: session as never });
    expect(session.closeProcess).toHaveBeenCalledTimes(2);
    expect(session.clearRuntimeListeners).toHaveBeenCalledOnce();
    expect(session.releaseAgentToolsMcp).toHaveBeenCalledOnce();
    expect(skills.release).toHaveBeenCalledOnce();
    expect(protectedRun.closeProcess).not.toHaveBeenCalled();
  });
});
