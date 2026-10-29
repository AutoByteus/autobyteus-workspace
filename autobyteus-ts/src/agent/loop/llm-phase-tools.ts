import type { AgentContext } from '../context/agent-context.js';

export function resolveTurnToolNames(context: AgentContext): string[] {
  const toolNames: string[] = [];
  const toolInstances = context.state.toolInstances;
  // Once prepared, the instances are the agent's tools (an empty set included: every tool removed).
  if (toolInstances) {
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
