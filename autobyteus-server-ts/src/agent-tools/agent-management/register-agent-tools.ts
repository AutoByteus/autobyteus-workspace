import { registerCreateAgentDefinitionTool } from "./create-agent-definition.js";
import { registerDeleteAgentDefinitionTool } from "./delete-agent-definition.js";
import { registerGetAgentDefinitionTool } from "./get-agent-definition.js";
import { registerListAgentDefinitionsTool } from "./list-agent-definitions.js";
import { registerUpdateAgentDefinitionTool } from "./update-agent-definition.js";

export function registerAgentManagementTools(): void {
  registerCreateAgentDefinitionTool();
  registerGetAgentDefinitionTool();
  registerListAgentDefinitionsTool();
  registerUpdateAgentDefinitionTool();
  registerDeleteAgentDefinitionTool();
}
