import { buildSchema } from 'type-graphql';
import { HealthResolver } from './types/health.js';
import { ServerSettingsResolver } from './types/server-settings.js';
import { WorkingContextCompactionStrategyResolver } from './types/working-context-compaction-strategy.js';
import { ApplicationResolver } from './types/application.js';
import { ApplicationCapabilityResolver } from './types/application-capability.js';
import { SkillResolver } from './types/skills.js';
import { AgentRunResolver } from './types/agent-run.js';
import { AgentTeamRunResolver } from './types/agent-team-run.js';
import { WorkspaceResolver } from './types/workspace.js';
import { AgentDefinitionResolver } from './types/agent-definition.js';
import { AgentTeamDefinitionResolver } from './types/agent-team-definition.js';
import { TokenUsageStatisticsResolver } from './types/token-usage-stats.js';
import { TokenUsageAnalyticsResolver } from './types/token-usage-analytics.js';
import { AgentCustomizationOptionsResolver } from './types/agent-customization-options.js';
import { FileExplorerResolver } from './types/file-explorer.js';
import { LlmProviderResolver } from './types/llm-provider.js';
import { ToolManagementResolver } from './types/tool-management.js';
import { McpServerResolver } from './types/mcp-server.js';
import { MemoryExplorerResolver } from './types/memory-explorer.js';
import { MemoryViewResolver } from './types/memory-view.js';
import { MemorySyncResolver } from './types/memory-sync.js';
import { ExternalChannelSetupResolver } from './types/external-channel-setup.js';
import { RunHistoryResolver } from './types/run-history.js';
import { RunFileChangesResolver } from './types/run-file-changes.js';
import { TeamCommunicationResolver } from './types/team-communication.js';
import { TaskDelegationResolver } from './types/task-delegation.js';
import { TeamRunHistoryResolver } from './types/team-run-history.js';
import { RuntimeAvailabilityResolver } from './types/runtime-availability.js';
import { AgentPackageResolver } from './types/agent-packages.js';
import { ApplicationPackageResolver } from './types/application-packages.js';
import { ManagedMessagingGatewayResolver } from './types/managed-messaging-gateway.js';
import { AppDataMigrationResolver } from './types/app-data-migrations.js';
import { SkillImprovementResolver } from './types/skill-improvement.js';
import { DateTimeScalar } from './scalars/date-time.js';
import { SecretStorageResolver } from './types/secret-storage.js';

export async function buildGraphqlSchema() {
  return buildSchema({
    resolvers: [
      HealthResolver,
      ServerSettingsResolver,
      WorkingContextCompactionStrategyResolver,
      ApplicationResolver,
      ApplicationCapabilityResolver,
      SkillResolver,
      AgentRunResolver,
      AgentTeamRunResolver,
      WorkspaceResolver,
      AgentDefinitionResolver,
      AgentTeamDefinitionResolver,
      TokenUsageStatisticsResolver,
      TokenUsageAnalyticsResolver,
      AgentCustomizationOptionsResolver,
      FileExplorerResolver,
      LlmProviderResolver,
      ToolManagementResolver,
      McpServerResolver,
      MemoryExplorerResolver,
      MemoryViewResolver,
      MemorySyncResolver,
      ExternalChannelSetupResolver,
      RunHistoryResolver,
      RunFileChangesResolver,
      TeamCommunicationResolver,
      TaskDelegationResolver,
      TeamRunHistoryResolver,
      RuntimeAvailabilityResolver,
      AgentPackageResolver,
      ApplicationPackageResolver,
      ManagedMessagingGatewayResolver,
      AppDataMigrationResolver,
      SkillImprovementResolver,
      SecretStorageResolver,
    ],
    scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
  });
}
