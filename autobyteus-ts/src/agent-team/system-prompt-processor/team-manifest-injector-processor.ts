import { BaseSystemPromptProcessor } from '../../agent/system-prompt-processor/base-processor.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentContextLike } from '../../agent/context/agent-context-like.js';
import { resolveTeamCommunicationContext, type TeamCommunicationMember } from '../context/team-communication-context.js';

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
    const communicationContext = resolveTeamCommunicationContext((context as TeamContextCarrier).customData?.teamContext);
    if (!communicationContext) {
      console.debug(`Agent '${agentId}': No team communication context found; skipping team manifest injection.`);
      return systemPrompt;
    }

    const excludeName = context?.config?.name ?? '';
    const manifest = this.generateTeamManifest(communicationContext.members, excludeName);

    if (systemPrompt.includes('{{team}}')) {
      console.info(`Agent '${agentId}': Replacing {{team}} placeholder with team manifest.`);
      return systemPrompt.split('{{team}}').join(manifest);
    }

    console.info(`Agent '${agentId}': Appending team manifest to system prompt.`);
    return `${systemPrompt}\n\n## Team Manifest\n\n${manifest}`;
  }

  private generateTeamManifest(members: TeamCommunicationMember[], excludeName: string): string {
    const promptParts: string[] = [];
    const sortedMembers = [...members].sort((a, b) => a.memberName.localeCompare(b.memberName));

    for (const member of sortedMembers) {
      if (member.memberName === excludeName) {
        continue;
      }
      const description = member.description?.trim() || 'No description available.';
      promptParts.push(`- name: ${member.memberName}\n  description: ${description}`);
    }

    if (!promptParts.length) {
      return 'You are working alone. You have no team members to delegate to.';
    }

    return promptParts.join('\n');
  }
}
