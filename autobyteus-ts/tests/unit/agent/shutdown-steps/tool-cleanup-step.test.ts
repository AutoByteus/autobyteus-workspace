import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolCleanupStep } from '../../../../src/agent/shutdown-steps/tool-cleanup-step.js';
import { createAgentContext } from './helpers.js';

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ToolCleanupStep', () => {
  it('succeeds when no tool instances are present', async () => {
    const step = new ToolCleanupStep();
    const context = createAgentContext('agent-1');
    context.state.toolInstances = null;

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(console.debug).toHaveBeenCalledWith(
      "Agent 'agent-1': No tool instances found. Skipping ToolCleanupStep."
    );
  });

  it('cleans up sync and async tools', async () => {
    const step = new ToolCleanupStep();
    const context = createAgentContext('agent-1');

    const syncCleanup = vi.fn();
    const asyncCleanup = vi.fn().mockResolvedValue(undefined);

    context.state.toolInstances = {
      syncTool: { cleanup: syncCleanup } as any,
      asyncTool: { cleanup: asyncCleanup } as any
    };

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(syncCleanup).toHaveBeenCalledOnce();
    expect(asyncCleanup).toHaveBeenCalledOnce();
  });

  it('skips tools without cleanup hooks', async () => {
    const step = new ToolCleanupStep();
    const context = createAgentContext('agent-1');

    context.state.toolInstances = {
      noCleanupTool: {} as any
    };

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(console.debug).toHaveBeenCalledWith(
      "Agent 'agent-1': Tool 'noCleanupTool' has no cleanup hook. Skipping."
    );
  });

  it('continues cleanup and reports failures', async () => {
    const step = new ToolCleanupStep();
    const context = createAgentContext('agent-1');

    const failingCleanup = vi.fn(() => {
      throw new Error('cleanup failed');
    });
    const okCleanup = vi.fn();

    context.state.toolInstances = {
      failingTool: { cleanup: failingCleanup } as any,
      okTool: { cleanup: okCleanup } as any
    };

    const success = await step.execute(context);

    expect(success).toBe(false);
    expect(failingCleanup).toHaveBeenCalledOnce();
    expect(okCleanup).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledOnce();
  });
});
