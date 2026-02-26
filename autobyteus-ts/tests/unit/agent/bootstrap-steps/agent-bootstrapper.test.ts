import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentBootstrapper } from '../../../../src/agent/bootstrap-steps/agent-bootstrapper.js';
import { BaseBootstrapStep } from '../../../../src/agent/bootstrap-steps/base-bootstrap-step.js';
import { WorkspaceContextInitializationStep } from '../../../../src/agent/bootstrap-steps/workspace-context-initialization-step.js';
import { McpServerPrewarmingStep } from '../../../../src/agent/bootstrap-steps/mcp-server-prewarming-step.js';
import { SystemPromptProcessingStep } from '../../../../src/agent/bootstrap-steps/system-prompt-processing-step.js';
import { WorkingContextSnapshotRestoreStep } from '../../../../src/agent/bootstrap-steps/working-context-snapshot-restore-step.js';

class MockStep1 extends BaseBootstrapStep {
  async execute(): Promise<boolean> {
    return true;
  }
}

class MockStep2 extends BaseBootstrapStep {
  async execute(): Promise<boolean> {
    return true;
  }
}

describe('AgentBootstrapper', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it('initializes with default steps', () => {
    const bootstrapper = new AgentBootstrapper();
    expect(bootstrapper.bootstrapSteps).toHaveLength(4);
    expect(bootstrapper.bootstrapSteps[0]).toBeInstanceOf(WorkspaceContextInitializationStep);
    expect(bootstrapper.bootstrapSteps[1]).toBeInstanceOf(McpServerPrewarmingStep);
    expect(bootstrapper.bootstrapSteps[2]).toBeInstanceOf(SystemPromptProcessingStep);
    expect(bootstrapper.bootstrapSteps[3]).toBeInstanceOf(WorkingContextSnapshotRestoreStep);
    expect(
      debugSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('AgentBootstrapper initialized with default steps.')
      )
    ).toBe(true);
  });

  it('initializes with custom steps', () => {
    const customSteps = [new MockStep1(), new MockStep2()];
    const bootstrapper = new AgentBootstrapper(customSteps);
    expect(bootstrapper.bootstrapSteps).toBe(customSteps);
    expect(bootstrapper.bootstrapSteps).toHaveLength(2);
  });
});
