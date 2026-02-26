import { BaseBootstrapStep } from './base-bootstrap-step.js';
import type { AgentContext } from '../context/agent-context.js';

export class WorkspaceContextInitializationStep extends BaseBootstrapStep {
  constructor() {
    super();
    console.debug('WorkspaceContextInitializationStep initialized.');
  }

  async execute(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    console.info(`Agent '${agentId}': Executing WorkspaceContextInitializationStep.`);

    const workspace = context.workspace;
    if (!workspace) {
      console.debug(`Agent '${agentId}': No workspace configured. Skipping context injection.`);
      return true;
    }

    try {
      if (typeof (workspace as any).setContext === 'function') {
        (workspace as any).setContext(context);
        console.info(
          `Agent '${agentId}': AgentContext successfully injected into workspace instance of type '${workspace.constructor.name}'.`
        );
      } else {
        console.warn(
          `Agent '${agentId}': Configured workspace of type '${workspace.constructor.name}' does not have a 'setContext' method. ` +
            "Workspace will not have access to the agent's context."
        );
      }
      return true;
    } catch (error) {
      console.error(
        `Agent '${agentId}': Critical failure during WorkspaceContextInitializationStep: ${error}`
      );
      return false;
    }
  }
}
