import { buildSchema } from "type-graphql";
import { HealthResolver } from "./types/health.js";
import { ServerSettingsResolver } from "./types/server-settings.js";
import { ApplicationResolver } from "./types/application.js";
import { SkillResolver } from "./types/skills.js";
import { AgentRunResolver } from "./types/agent-run.js";
import { AgentTeamRunResolver } from "./types/agent-team-run.js";
import { WorkspaceResolver } from "./types/workspace.js";
import { PromptResolver } from "./types/prompt.js";
import { AgentDefinitionResolver } from "./types/agent-definition.js";
import { AgentTeamDefinitionResolver } from "./types/agent-team-definition.js";
import { TokenUsageStatisticsResolver } from "./types/token-usage-stats.js";
import { AgentArtifactResolver } from "./types/agent-artifact.js";
import { AgentCustomizationOptionsResolver } from "./types/agent-customization-options.js";
import { FileExplorerResolver } from "./types/file-explorer.js";
import { LlmProviderResolver } from "./types/llm-provider.js";
import { ToolManagementResolver } from "./types/tool-management.js";
import { McpServerResolver } from "./types/mcp-server.js";
import { MemoryIndexResolver } from "./types/memory-index.js";
import { MemoryViewResolver } from "./types/memory-view.js";
import { ExternalChannelSetupResolver } from "./types/external-channel-setup.js";
import { NodeSyncResolver } from "./types/node-sync.js";
import { NodeSyncControlResolver } from "./types/node-sync-control.js";
import { AgentRunHistoryResolver } from "./types/agent-run-history.js";
import { TeamRunHistoryResolver } from "./types/team-run-history.js";
import { FederatedCatalogResolver } from "./types/federated-catalog.js";
import { NodeDiscoveryResolver } from "./types/node-discovery.js";
import { DateTimeScalar } from "./scalars/date-time.js";

export async function buildGraphqlSchema() {
  return buildSchema({
    resolvers: [
      HealthResolver,
      ServerSettingsResolver,
      ApplicationResolver,
      SkillResolver,
      AgentRunResolver,
      AgentTeamRunResolver,
      WorkspaceResolver,
      PromptResolver,
      AgentDefinitionResolver,
      AgentTeamDefinitionResolver,
      TokenUsageStatisticsResolver,
      AgentArtifactResolver,
      AgentCustomizationOptionsResolver,
      FileExplorerResolver,
      LlmProviderResolver,
      ToolManagementResolver,
      McpServerResolver,
      MemoryIndexResolver,
      MemoryViewResolver,
      ExternalChannelSetupResolver,
      NodeSyncResolver,
      NodeSyncControlResolver,
      AgentRunHistoryResolver,
      TeamRunHistoryResolver,
      FederatedCatalogResolver,
      NodeDiscoveryResolver,
    ],
    scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
  });
}
