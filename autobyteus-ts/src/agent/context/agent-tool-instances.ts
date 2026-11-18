import { BaseTool } from '../../tools/base-tool.js';

/** The name an agent calls a tool instance by (its own `getName()`, else its class name). */
export const resolveToolInstanceName = (tool: BaseTool): string => {
  const nameResolver = (tool as any).getName;
  return typeof nameResolver === 'function'
    ? (tool as any).getName()
    : (tool.constructor as typeof BaseTool).getName();
};

/** The agent's tool instances by name; a duplicate name keeps the last instance. */
export const buildToolInstanceMap = (
  agentId: string,
  tools: readonly BaseTool[],
): Record<string, BaseTool> => {
  const toolInstances: Record<string, BaseTool> = {};
  for (const tool of tools) {
    const instanceName = resolveToolInstanceName(tool);
    if (toolInstances[instanceName]) {
      console.warn(
        `Agent '${agentId}': Duplicate tool name '${instanceName}' encountered. The last one will be used.`
      );
    }
    toolInstances[instanceName] = tool;
  }
  return toolInstances;
};

/** Runs a tool instance's cleanup hook, if it has one. Returns false when the hook failed. */
export const cleanupToolInstance = async (
  agentId: string,
  toolName: string,
  tool: BaseTool,
): Promise<boolean> => {
  try {
    const cleanupFunc = (tool as any).cleanup;
    if (typeof cleanupFunc !== 'function') {
      console.debug(`Agent '${agentId}': Tool '${toolName}' has no cleanup hook. Skipping.`);
      return true;
    }
    const result = cleanupFunc.call(tool);
    if (result && typeof result.then === 'function') {
      await result;
    }
    return true;
  } catch (error) {
    console.error(`Agent '${agentId}': Error during cleanup of tool '${toolName}': ${error}`);
    return false;
  }
};
