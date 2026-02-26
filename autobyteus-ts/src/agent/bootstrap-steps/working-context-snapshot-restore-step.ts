import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { WorkingContextSnapshotBootstrapper } from '../../memory/restore/working-context-snapshot-bootstrapper.js';
import type { AgentContext } from '../context/agent-context.js';

export class WorkingContextSnapshotRestoreStep extends BaseBootstrapStep {
  private bootstrapper: WorkingContextSnapshotBootstrapper;

  constructor(bootstrapper: WorkingContextSnapshotBootstrapper | null = null) {
    super();
    this.bootstrapper = bootstrapper ?? new WorkingContextSnapshotBootstrapper();
    console.debug('WorkingContextSnapshotRestoreStep initialized.');
  }

  async execute(context: AgentContext): Promise<boolean> {
    const restoreOptions = (context.state as any).restoreOptions;
    if (!restoreOptions) {
      return true;
    }

    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      console.error('WorkingContextSnapshotRestoreStep requires a memory manager to restore working context snapshot.');
      return false;
    }

    let systemPrompt = context.state.processedSystemPrompt;
    if (!systemPrompt) {
      systemPrompt = context.llmInstance?.config?.systemMessage ?? '';
    }

    try {
      this.bootstrapper.bootstrap(memoryManager, systemPrompt, restoreOptions);
      return true;
    } catch (error) {
      console.error(`WorkingContextSnapshotRestoreStep failed: ${String(error)}`);
      return false;
    }
  }
}
