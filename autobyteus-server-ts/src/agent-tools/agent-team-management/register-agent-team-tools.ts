import { registerCreateAgentTeamDefinitionTool } from "./create-agent-team-definition.js";
import { registerDeleteAgentTeamDefinitionTool } from "./delete-agent-team-definition.js";
import { registerGetAgentTeamDefinitionTool } from "./get-agent-team-definition.js";
import { registerListAgentTeamDefinitionsTool } from "./list-agent-team-definitions.js";
import { registerUpdateAgentTeamDefinitionTool } from "./update-agent-team-definition.js";

export function registerAgentTeamManagementTools(): void {
  registerCreateAgentTeamDefinitionTool();
  registerGetAgentTeamDefinitionTool();
  registerListAgentTeamDefinitionsTool();
  registerUpdateAgentTeamDefinitionTool();
  registerDeleteAgentTeamDefinitionTool();
}
