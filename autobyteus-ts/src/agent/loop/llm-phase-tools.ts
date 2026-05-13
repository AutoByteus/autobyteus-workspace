import { defaultToolRegistry } from '../../tools/registry/tool-registry.js';
import type { AgentContext } from '../context/agent-context.js';
import type { ParameterSchema } from '../../utils/parameter-schema.js';

export function resolveTurnToolNames(context: AgentContext): string[] {
  const toolNames: string[] = [];
  const toolInstances = context.state.toolInstances;
  if (toolInstances && Object.keys(toolInstances).length > 0) {
    toolNames.push(...Object.keys(toolInstances));
  } else if (context.config.tools) {
    for (const tool of context.config.tools as any[]) {
      if (typeof tool === 'string') {
        toolNames.push(tool);
      } else if (tool && typeof tool.getName === 'function') {
        try {
          toolNames.push(tool.getName());
        } catch {
          // Ignore malformed configured tool entries; runtime initialization owns validation.
        }
      }
    }
  }
  return toolNames;
}

export function buildToolArgumentSchemaResolver(
  context: AgentContext
): (toolName: string) => ParameterSchema | null {
  return (toolName: string): ParameterSchema | null => {
    const toolInstance = context.state.toolInstances?.[toolName];
    if (toolInstance) {
      try {
        if (toolInstance.definition?.argumentSchema) return toolInstance.definition.argumentSchema;
        const toolClass = toolInstance.constructor as { getArgumentSchema?: () => ParameterSchema | null };
        if (typeof toolClass.getArgumentSchema === 'function') return toolClass.getArgumentSchema();
      } catch (error) {
        console.warn(`Agent '${context.agentId}': Failed to resolve argument schema for tool '${toolName}': ${error}`);
      }
    }
    return defaultToolRegistry.getToolDefinition(toolName)?.argumentSchema ?? null;
  };
}
