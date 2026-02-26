import { describe, it, expect, vi } from 'vitest';
import { WorkingContextSnapshotRestoreStep } from '../../../../src/agent/bootstrap-steps/working-context-snapshot-restore-step.js';
import { WorkingContextSnapshotBootstrapOptions } from '../../../../src/memory/restore/working-context-snapshot-bootstrapper.js';

describe('WorkingContextSnapshotRestoreStep', () => {
  it('no-ops without restore options', async () => {
    const step = new WorkingContextSnapshotRestoreStep();
    const context = { state: { restoreOptions: null } } as any;

    const result = await step.execute(context);

    expect(result).toBe(true);
  });

  it('calls bootstrapper when restore options are set', async () => {
    const bootstrapper = { bootstrap: vi.fn() };
    const step = new WorkingContextSnapshotRestoreStep(bootstrapper as any);
    const restoreOptions = new WorkingContextSnapshotBootstrapOptions();
    const memoryManager = {};
    const context = {
      state: {
        restoreOptions,
        memoryManager,
        processedSystemPrompt: 'System'
      },
      llmInstance: { config: { systemMessage: 'fallback' } }
    } as any;

    const result = await step.execute(context);

    expect(result).toBe(true);
    expect(bootstrapper.bootstrap).toHaveBeenCalledWith(memoryManager, 'System', restoreOptions);
  });
});
