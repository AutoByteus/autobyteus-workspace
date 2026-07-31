import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AutoByteusAgentRunBackendFactory } from "../../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { ClaudeAgentRunBackendFactory } from "../../agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../agent-execution/backends/claude/session/claude-session-manager.js";
import { ActiveAgentRunRegistry } from "../../agent-execution/runtime/active-agent-run-registry.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentRunResourceManager } from "../../agent-execution/services/agent-run-resource-manager.js";
import { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { ApplicationPublishedArtifactDeliveryQueue } from "../../application-orchestration/services/application-published-artifact-delivery-queue.js";
import type { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactProjectionStore } from "../../services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../services/published-artifacts/published-artifact-snapshot-store.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TeamCommunicationService } from "../../services/team-communication/team-communication-service.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
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
  const memoryLocationService = new AgentMemoryLocationService({ memoryDir });
  const runFileChangeService = new RunFileChangeService({
    memoryDir,
    memoryLocationService,
  });
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
  const activeRunRegistry = new ActiveAgentRunRegistry(resourceManager);
  const projectionStore = new PublishedArtifactProjectionStore();
  const snapshotStore = new PublishedArtifactSnapshotStore();
  const publicationService = new PublishedArtifactPublicationService({
    activeRunReader: activeRunRegistry,
    workspaceManager: getWorkspaceManager(),
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
  const memberTeamContextBuilder = new MemberTeamContextBuilder(
    input.agentTeamDefinitionService,
  );
  const codexThreadBootstrapper = new CodexThreadBootstrapper(
    undefined,
    undefined,
    input.agentDefinitionService,
    undefined,
    undefined,
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
    activeRunRegistry,
    memoryRecorder,
  });
  const agentTeamRunManager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
      memberTeamContextBuilder,
      createTeamManager: (context, subTeamRunFactory) =>
        new MixedTeamManager(context, {
          subTeamRunFactory,
          agentRunManager,
          agentToolMcpSessionManager: agentToolsSessionManager,
          memberTeamContextBuilder,
        }),
    }),
    teamCommunicationService: new TeamCommunicationService({ memoryDir }),
    runFileChangeService,
  });
  const agentRunMetadataService = new AgentRunMetadataService(memoryDir);
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
  const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager,
    agentRunMetadataService,
    teamRunMetadataService,
    memoryDir,
  });
  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    agentRunIdentityAllocator,
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    teamRunMetadataService,
    agentRunIdentityAllocator,
    teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: agentTeamRunManager,
    }),
    memoryDir,
    memoryLocationService,
  });
  return {
    agentRunService,
    teamRunService,
    teamRunMetadataService,
    runShutdownCoordinator: new ApplicationRunShutdownCoordinator(
      agentTeamRunManager,
      agentRunManager,
    ),
    publicationService,
    publishedArtifactProjectionService: new PublishedArtifactProjectionService({
      activeRunReader: activeRunRegistry,
      metadataService: agentRunMetadataService,
      projectionStore,
      snapshotStore,
    }),
    memoryLocationService,
    agentToolsSessionManager,
    activeRunRegistry,
    agentRunManager,
    agentTeamRunManager,
  };
};
