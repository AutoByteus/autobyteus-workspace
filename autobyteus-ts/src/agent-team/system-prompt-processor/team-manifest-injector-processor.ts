import { BaseSystemPromptProcessor } from '../../agent/system-prompt-processor/base-processor.js';
import { AgentConfig } from '../../agent/context/agent-config.js';
import { AgentTeamConfig } from '../context/agent-team-config.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';
import type { TeamNodeConfig } from '../context/team-node-config.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentContextLike } from '../../agent/context/agent-context-like.js';

type TeamContextCarrier = AgentContextLike & {
  customData?: Record<string, any>;
};

export class TeamManifestInjectorProcessor extends BaseSystemPromptProcessor {
  static getName(): string {
    return 'TeamManifestInjector';
  }

  static getOrder(): number {
    return 450;
  }

  process(
    systemPrompt: string,
    _toolInstances: Record<string, BaseTool>,
    agentId: string,
    context: AgentContextLike
  ): string {
    const teamContext = (context as TeamContextCarrier).customData?.teamContext as AgentTeamContext | undefined;
    if (!teamContext) {
      console.debug(`Agent '${agentId}': No teamContext found; skipping team manifest injection.`);
      return systemPrompt;
    }

    const excludeName = context?.config?.name ?? '';
    const manifest = this.generateTeamManifest(teamContext, excludeName);

    if (systemPrompt.includes('{{team}}')) {
      console.info(`Agent '${agentId}': Replacing {{team}} placeholder with team manifest.`);
      return systemPrompt.split('{{team}}').join(manifest);
    }

    console.info(`Agent '${agentId}': Appending team manifest to system prompt.`);
    return `${systemPrompt}\n\n## Team Manifest\n\n${manifest}`;
  }

  private generateTeamManifest(context: AgentTeamContext, excludeName: string): string {
    const promptParts: string[] = [];
    const sortedNodes = [...context.config.nodes].sort((a: TeamNodeConfig, b: TeamNodeConfig) =>
      a.name.localeCompare(b.name)
    );

    for (const node of sortedNodes) {
      if (node.name === excludeName) {
        continue;
      }

      const nodeDef = node.nodeDefinition;
      let description = 'No description available.';

      if (nodeDef instanceof AgentConfig) {
        if (typeof nodeDef.description === 'string') {
          description = nodeDef.description;
        }
      } else if (nodeDef instanceof AgentTeamConfig) {
        description = nodeDef.role ?? nodeDef.description;
      }

      promptParts.push(`- name: ${node.name}\n  description: ${description}`);
    }

    if (!promptParts.length) {
      return 'You are working alone. You have no team members to delegate to.';
    }

    return promptParts.join('\n');
  }
}
