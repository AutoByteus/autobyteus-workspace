import { buildSchema } from 'type-graphql';
import { HealthResolver } from './types/health.js';
import { ServerSettingsResolver } from './types/server-settings.js';
import { ApplicationResolver } from './types/application.js';
import { ApplicationCapabilityResolver } from './types/application-capability.js';
import { SkillResolver } from './types/skills.js';
import { AgentRunResolver } from './types/agent-run.js';
import { AgentTeamRunResolver } from './types/agent-team-run.js';
import { DelegatedLaunchSelectionResolver } from './types/delegated-launch-selection.js';
import { WorkspaceResolver } from './types/workspace.js';
import { AgentDefinitionResolver } from './types/agent-definition.js';
import { AgentTeamDefinitionResolver } from './types/agent-team-definition.js';
import { AgentOrgDefinitionResolver } from './types/agent-org-definition.js';
import { AgentOrgRunResolver } from './types/agent-org-run.js';
import { AgentRunCollaborationResolver } from './types/agent-run-collaboration.js';
import { TokenUsageStatisticsResolver } from './types/token-usage-stats.js';
import { TokenUsageAnalyticsResolver } from './types/token-usage-analytics.js';
import { AgentCustomizationOptionsResolver } from './types/agent-customization-options.js';
import { FileExplorerResolver } from './types/file-explorer.js';
import { LlmProviderResolver } from './types/llm-provider.js';
import { ToolManagementResolver } from './types/tool-management.js';
import { McpServerResolver } from './types/mcp-server.js';
import { MemoryExplorerResolver } from './types/memory-explorer.js';
import { MemoryViewResolver } from './types/memory-view.js';
import { MemorySearchResolver } from './types/memory-search.js';
import { MemorySyncResolver } from './types/memory-sync.js';
import { RemoteCollaborationSettingsResolver } from './types/remote-collaboration-settings.js';
import { RunHistoryResolver } from './types/run-history.js';
import { RunFileChangesResolver } from './types/run-file-changes.js';
import { TeamCommunicationResolver } from './types/team-communication.js';
import { TeamRunHistoryResolver } from './types/team-run-history.js';
import { RuntimeAvailabilityResolver } from './types/runtime-availability.js';
import { AgentPackageResolver } from './types/agent-packages.js';
import { ApplicationPackageResolver } from './types/application-packages.js';
import { AppDataMigrationResolver } from './types/app-data-migrations.js';
import { DateTimeScalar } from './scalars/date-time.js';
import { SecretStorageResolver } from './types/secret-storage.js';
import { DefinitionProblemsResolver } from './types/definition-problems.js';
import { AgentPackageDefinitionsResolver } from './types/agent-package-definitions.js';
import { CollaborationRootHistoryResolver } from './types/collaboration-root-history.js';
import { ProjectResolver } from './types/projects.js';
import { ProjectTaskResolver } from './types/project-tasks.js';
import { ProjectTaskSearchResolver } from './types/project-task-search.js';
import { EmbeddingModelResolver } from './types/embeddings.js';
import { UpdateNotificationResolver } from './types/update-notifications.js';
import { AgentRuntimesResolver } from './types/agent-runtimes.js';

export async function buildGraphqlSchema() {
  return buildSchema({
    resolvers: [
      HealthResolver,
      ServerSettingsResolver,
      ApplicationResolver,
      ApplicationCapabilityResolver,
      SkillResolver,
      AgentRunResolver,
      AgentTeamRunResolver,
      DelegatedLaunchSelectionResolver,
      WorkspaceResolver,
      AgentDefinitionResolver,
      AgentTeamDefinitionResolver,
      AgentOrgDefinitionResolver,
      AgentOrgRunResolver,
      AgentRunCollaborationResolver,
      TokenUsageStatisticsResolver,
      TokenUsageAnalyticsResolver,
      AgentCustomizationOptionsResolver,
      FileExplorerResolver,
      LlmProviderResolver,
      ToolManagementResolver,
      McpServerResolver,
      MemoryExplorerResolver,
      MemoryViewResolver,
      MemorySearchResolver,
      MemorySyncResolver,
      RemoteCollaborationSettingsResolver,
      RunHistoryResolver,
      RunFileChangesResolver,
      TeamCommunicationResolver,
      TeamRunHistoryResolver,
      RuntimeAvailabilityResolver,
      AgentPackageResolver,
      ApplicationPackageResolver,
      AppDataMigrationResolver,
      UpdateNotificationResolver,
      SecretStorageResolver,
      DefinitionProblemsResolver,
      AgentPackageDefinitionsResolver,
      CollaborationRootHistoryResolver,
      ProjectResolver,
      ProjectTaskResolver,
      ProjectTaskSearchResolver,
      EmbeddingModelResolver,
      AgentRuntimesResolver,
    ],
    scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
  });
}
