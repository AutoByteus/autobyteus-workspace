import { BaseAgentTeamBootstrapStep } from './base-agent-team-bootstrap-step.js';
import { AgentConfig } from '../../agent/context/agent-config.js';
import { TeamManifestInjectorProcessor } from '../system-prompt-processor/team-manifest-injector-processor.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamManager } from '../context/team-manager.js';

export class AgentConfigurationPreparationStep extends BaseAgentTeamBootstrapStep {
  async execute(context: AgentTeamContext): Promise<boolean> {
    const teamId = context.teamId;
    console.info(
      `Team '${teamId}': Executing AgentConfigurationPreparationStep to prepare all agent configurations.`
    );

    const teamManager = context.teamManager as TeamManager | null;
    if (!teamManager) {
      console.error(`Team '${teamId}': TeamManager not found in context during agent config preparation.`);
      return false;
    }

    try {
      for (const nodeConfigWrapper of context.config.nodes) {
        if (nodeConfigWrapper.isSubTeam) {
          continue;
        }

        const uniqueName = nodeConfigWrapper.name;
        const nodeDefinition = nodeConfigWrapper.nodeDefinition;

        if (!(nodeDefinition instanceof AgentConfig)) {
          console.warn(
            `Team '${teamId}': Node '${uniqueName}' has an unexpected definition type and will be skipped: ` +
            `${typeof nodeDefinition}`
          );
          continue;
        }

        const finalConfig = nodeDefinition.copy();

        if (!finalConfig.initialCustomData) {
          finalConfig.initialCustomData = {};
        }
        finalConfig.initialCustomData.teamContext = context;
        console.debug(
          `Team '${teamId}': Injected shared teamContext into initialCustomData for agent '${uniqueName}'.`
        );

        if (!finalConfig.systemPromptProcessors) {
          finalConfig.systemPromptProcessors = [];
        }
        const hasTeamManifestProcessor = finalConfig.systemPromptProcessors.some(
          (processor) => processor instanceof TeamManifestInjectorProcessor
        );
        if (!hasTeamManifestProcessor) {
          finalConfig.systemPromptProcessors.push(new TeamManifestInjectorProcessor());
          console.debug(
            `Team '${teamId}': Attached TeamManifestInjectorProcessor for agent '${uniqueName}'.`
          );
        }

        context.state.finalAgentConfigs[uniqueName] = finalConfig;
        const toolNames = finalConfig.tools.map((tool) => {
          const ctor = tool.constructor as { getName?: () => string; name?: string };
          return ctor.getName?.() ?? ctor.name ?? 'unknown';
        });
        console.info(
          `Team '${teamId}': Prepared final config for agent '${uniqueName}' with user-defined tools: ${toolNames}`
        );
      }

      return true;
    } catch (error) {
      console.error(`Team '${teamId}': Failed during agent configuration preparation: ${error}`);
      return false;
    }
  }
}
