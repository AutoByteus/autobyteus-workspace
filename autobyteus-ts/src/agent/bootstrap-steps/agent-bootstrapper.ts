import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { WorkspaceContextInitializationStep } from './workspace-context-initialization-step.js';
import { SystemPromptProcessingStep } from './system-prompt-processing-step.js';
import { McpServerPrewarmingStep } from './mcp-server-prewarming-step.js';
import { WorkingContextSnapshotRestoreStep } from './working-context-snapshot-restore-step.js';

export class AgentBootstrapper {
  bootstrapSteps: BaseBootstrapStep[];

  constructor(steps: BaseBootstrapStep[] | null = null) {
    if (!steps) {
      this.bootstrapSteps = [
        new WorkspaceContextInitializationStep(),
        new McpServerPrewarmingStep(),
        new SystemPromptProcessingStep(),
        new WorkingContextSnapshotRestoreStep()
      ];
      console.debug('AgentBootstrapper initialized with default steps.');
    } else {
      this.bootstrapSteps = steps;
      console.debug(`AgentBootstrapper initialized with ${steps.length} custom steps.`);
    }
  }
}
