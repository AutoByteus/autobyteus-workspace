import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  cleanupMcpServerInstancesForAgent: vi.fn()
}));

vi.mock('../../../../src/tools/mcp/server-instance-manager.js', () => {
  class MockMcpServerInstanceManager {
    cleanupMcpServerInstancesForAgent = mocks.cleanupMcpServerInstancesForAgent;
  }

  return { McpServerInstanceManager: MockMcpServerInstanceManager };
});

import { McpServerCleanupStep } from '../../../../src/agent/shutdown-steps/mcp-server-cleanup-step.js';
import { createAgentContext } from './helpers.js';

beforeEach(() => {
  mocks.cleanupMcpServerInstancesForAgent.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('McpServerCleanupStep', () => {
  it('succeeds when instance manager cleanup succeeds', async () => {
    const step = new McpServerCleanupStep();
    const context = createAgentContext('agent-1');

    mocks.cleanupMcpServerInstancesForAgent.mockResolvedValue(undefined);

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(mocks.cleanupMcpServerInstancesForAgent).toHaveBeenCalledOnce();
    expect(mocks.cleanupMcpServerInstancesForAgent).toHaveBeenCalledWith('agent-1');
  });

  it('fails when instance manager cleanup throws', async () => {
    const step = new McpServerCleanupStep();
    const context = createAgentContext('agent-1');

    mocks.cleanupMcpServerInstancesForAgent.mockRejectedValue(new Error('Failed to close server process'));

    const success = await step.execute(context);

    expect(success).toBe(false);
    expect(mocks.cleanupMcpServerInstancesForAgent).toHaveBeenCalledOnce();
    expect(mocks.cleanupMcpServerInstancesForAgent).toHaveBeenCalledWith('agent-1');
    expect(console.error).toHaveBeenCalledOnce();
  });
});
