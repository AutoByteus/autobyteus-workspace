import { registerApplyMcpServerConfigurationsTool } from "./apply-mcp-server-configurations.js";
import { registerDeleteMcpServerConfigurationTool } from "./delete-mcp-server-configuration.js";
import { registerDiscoverMcpServerToolsTool } from "./discover-mcp-server-tools.js";
import { registerGetMcpServerConfigurationTool } from "./get-mcp-server-configuration.js";
import { registerListMcpServerConfigurationsTool } from "./list-mcp-server-configurations.js";
import { registerPreviewMcpServerToolsTool } from "./preview-mcp-server-tools.js";

export function registerMcpServerManagementTools(): void {
  registerListMcpServerConfigurationsTool();
  registerGetMcpServerConfigurationTool();
  registerDeleteMcpServerConfigurationTool();
  registerApplyMcpServerConfigurationsTool();
  registerDiscoverMcpServerToolsTool();
  registerPreviewMcpServerToolsTool();
}
