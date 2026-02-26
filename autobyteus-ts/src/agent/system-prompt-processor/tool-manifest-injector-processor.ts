import { BaseSystemPromptProcessor } from './base-processor.js';
import { defaultToolRegistry } from '../../tools/registry/tool-registry.js';
import { ToolManifestProvider } from '../../tools/usage/providers/tool-manifest-provider.js';
import type { BaseTool } from '../../tools/base-tool.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export class ToolManifestInjectorProcessor extends BaseSystemPromptProcessor {
  private manifestProvider: ToolManifestProvider | null = null;

  static getName(): string {
    return 'ToolManifestInjector';
  }

  static getOrder(): number {
    return 500;
  }

  static isMandatory(): boolean {
    return true;
  }

  process(
    systemPrompt: string,
    toolInstances: Record<string, BaseTool>,
    agentId: string,
    context: AgentContextLike
  ): string {
    const toolNames = Object.keys(toolInstances ?? {});
    if (toolNames.length === 0) {
      console.info(`Agent '${agentId}': No tools configured. Skipping tool injection.`);
      return systemPrompt;
    }

    const llmProvider = context?.llmInstance?.model?.provider;

    const toolDefinitions = toolNames
      .map((name) => defaultToolRegistry.getToolDefinition(name))
      .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));

    if (toolDefinitions.length === 0) {
      console.warn(`Agent '${agentId}': Tools configured but no definitions found in registry.`);
      return systemPrompt;
    }

    try {
      if (!this.manifestProvider) {
        this.manifestProvider = new ToolManifestProvider();
      }
      const toolsManifest = this.manifestProvider.provide(toolDefinitions, llmProvider ?? null);

      const toolsBlock = `\n\n## Accessible Tools\n\n${toolsManifest}`;
      console.info(`Agent '${agentId}': Injected ${toolDefinitions.length} tools.`);
      return systemPrompt + toolsBlock;
    } catch (error) {
      console.error(`Agent '${agentId}': Failed to generate tool manifest: ${error}`);
      return systemPrompt;
    }
  }
}
