import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AutoByteusAgentRunBackendFactory } from "../../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { ClaudeAgentRunBackendFactory } from "../../agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../agent-execution/backends/claude/session/claude-session-manager.js";
import { AgentRunActivationRegistry } from "../../agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentRunProvisioningService } from "../../agent-execution/services/agent-run-provisioning-service.js";
import { AgentRunResourceManager } from "../../agent-execution/services/agent-run-resource-manager.js";
import { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { ApplicationPublishedArtifactDeliveryQueue } from "../../application-orchestration/services/application-published-artifact-delivery-queue.js";
import type { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactProjectionStore } from "../../services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../services/published-artifacts/published-artifact-snapshot-store.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { ApplicationAgentToolMcpSessionScope } from "../../agent-tools/mcp/application-agent-tool-mcp-session-scope.js";
import type { ApplicationAgentToolsSessionFactory } from "../../agent-tools/mcp/agent-tools-mcp-runtime.js";
import { ApplicationRunShutdownCoordinator } from "./application-run-shutdown-coordinator.js";

export const createApplicationRunServices = (input: {
  appConfig: AppConfig;
  bindingStore: ApplicationRunBindingStore;
  artifactDeliveryQueue: ApplicationPublishedArtifactDeliveryQueue;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  sessionScope: ApplicationAgentToolMcpSessionScope;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
}) => {
  const memoryDir = input.appConfig.getMemoryDir();
  const workspaceManager = getWorkspaceManager();
  const memoryLocationService = new AgentMemoryLocationService({ memoryDir });
  const runFileChangeService = new RunFileChangeService({ memoryDir, workspaceManager });
  const artifactRelay = new ApplicationPublishedArtifactRelayService({
    bindingStore: input.bindingStore,
    deliveryQueue: input.artifactDeliveryQueue,
  });
  const memoryRecorder = new AgentRunMemoryRecorder();
  const resourceManager = new AgentRunResourceManager({
    sessionScope: input.sessionScope,
    runFileChangeService,
    publishedArtifactRelayService: artifactRelay,
    memoryRecorder,
  });
  const activationRegistry = new AgentRunActivationRegistry(resourceManager);
  const projectionStore = new PublishedArtifactProjectionStore();
  const snapshotStore = new PublishedArtifactSnapshotStore();
  const publicationService = new PublishedArtifactPublicationService({
    activeRunReader: activationRegistry,
    workspaceManager,
    publishedArtifactRelayService: artifactRelay,
    projectionStore,
    snapshotStore,
  });
  const agentToolsSessionManager = input.agentToolsSessionFactory
    .createApplicationSessionManager({
      scope: input.sessionScope,
      executionCapabilities: {
        publishedArtifactPublisher: publicationService,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });

  const codexThreadBootstrapper = new CodexThreadBootstrapper(
    undefined,
    undefined,
    input.agentDefinitionService,
    undefined,
    undefined,
    agentToolsSessionManager,
  );
  const claudeSessionManager = new ClaudeSessionManager(
    undefined,
    undefined,
    agentToolsSessionManager,
  );
  const claudeSessionBootstrapper = new ClaudeSessionBootstrapper(
    undefined,
    undefined,
    input.agentDefinitionService,
  );
  const agentRunManager = new AgentRunManager({
    autoByteusBackendFactory: new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: input.agentDefinitionService,
    }),
    codexBackendFactory: new CodexAgentRunBackendFactory(
      undefined,
      codexThreadBootstrapper,
    ),
    claudeBackendFactory: new ClaudeAgentRunBackendFactory(
      claudeSessionManager,
      claudeSessionBootstrapper,
    ),
    activationRegistry,
    memoryRecorder,
  });

  const memberTeamContextBuilder = new MemberTeamContextBuilder(
    input.agentTeamDefinitionService,
  );
  const activityInspector = new AgentConversationActivityInspector();
  const agentTeamRunManager = new AgentTeamRunManager({
    memoryDir,
    mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
      createTeamManager: (context, subTeamRunFactory, callbacks) =>
        new MixedTeamManager(context, {
          subTeamRunFactory,
          taskRootResolver: callbacks.taskRootResolver,
          agentRunManager,
          agentToolMcpSessionManager: agentToolsSessionManager,
          memoryLocationService,
          activityInspector,
          memberTeamContextBuilder,
          workspaceManager,
          publish: callbacks.publish,
          deliverInterAgentMessage: callbacks.deliverInterAgentMessage,
          acceptPlatformBinding: callbacks.acceptPlatformBinding,
        }),
    }),
    executionTreeStore: new TeamRunExecutionTreeStore(),
    taskRecordsStore: new TaskDelegationRecordsV1Store(),
    communicationStore: new TeamCommunicationV1Store(),
  });

  const agentRunMetadataService = new AgentRunMetadataService(memoryDir);
  const agentRunHistoryCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager,
  });
  const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager,
    agentRunMetadataService,
    teamRunExecutionTreeLocationService: new TeamRunExecutionTreeLocationService({ memoryDir }),
    memoryDir,
  });
  const tokenUsageReadiness = new TokenUsageMigrationReadiness();
  const provisioningService = new AgentRunProvisioningService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    historyCatalogService: agentRunHistoryCatalogService,
    workspaceManager,
    agentRunIdentityAllocator,
  });
  const lifecycleService = new StandaloneAgentRunLifecycleService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    historyCatalogService: agentRunHistoryCatalogService,
    workspaceManager,
    tokenUsageReadiness,
  });
  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    historyCatalogService: agentRunHistoryCatalogService,
    workspaceManager,
    agentRunIdentityAllocator,
    provisioningService,
    lifecycleService,
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    agentRunIdentityAllocator,
    teamRunIdentityAllocator: new TeamRunIdentityAllocator(),
    teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: agentTeamRunManager,
    }),
    workspaceManager,
    memoryDir,
    memoryLocationService,
    tokenUsageReadiness,
  });

  return {
    agentRunService,
    teamRunService,
    runShutdownCoordinator: new ApplicationRunShutdownCoordinator(
      agentTeamRunManager,
      agentRunManager,
    ),
    publicationService,
    publishedArtifactProjectionService: new PublishedArtifactProjectionService({
      activeRunReader: activationRegistry,
      metadataService: agentRunMetadataService,
      projectionStore,
      snapshotStore,
    }),
    memoryLocationService,
    agentToolsSessionManager,
    activationRegistry,
    agentRunManager,
    agentTeamRunManager,
  };
};
