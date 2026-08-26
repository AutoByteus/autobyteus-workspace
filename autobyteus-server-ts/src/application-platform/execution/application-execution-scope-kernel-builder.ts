import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AgentRunActivationRegistry } from "../../agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentRunProvisioningService } from "../../agent-execution/services/agent-run-provisioning-service.js";
import { AgentRunResourceManager } from "../../agent-execution/services/agent-run-resource-manager.js";
import { AgentRunProviderInputNormalizer } from "../../agent-execution/input/agent-run-provider-input-normalizer.js";
import { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { createTaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { ApplicationAgentStreamRuntimeSource } from "../../application-agent-streaming/services/application-agent-stream-runtime-source.js";
import { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { PublishedArtifactProjectionStore } from "../../services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactSnapshotStore } from "../../services/published-artifacts/published-artifact-snapshot-store.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import { ApplicationExecutionShutdownCoordinator } from "./application-execution-shutdown-coordinator.js";
import type { ApplicationExecutionScopeBuildInput } from "./application-execution-scope-contracts.js";
import { ContextFileLayout } from "../../context-files/store/context-file-layout.js";
import { ContextFileOwnerResolver } from "../../context-files/services/context-file-owner-resolver.js";
import { ContextFileLocalPathResolver } from "../../context-files/services/context-file-local-path-resolver.js";

export type ApplicationExecutionScopeKernel = Readonly<{
  agentRunService: AgentRunService;
  teamRunService: TeamRunService;
  sessionAuthority: ScopedAgentToolMcpSessionAuthority;
  shutdownCoordinator: ApplicationExecutionShutdownCoordinator;
  streamSource: ApplicationAgentStreamRuntimeSource;
  publicationService: PublishedArtifactPublicationService;
  projectionService: PublishedArtifactProjectionService;
  memoryLocationService: AgentMemoryLocationService;
  abortConstruction(): void;
}>;

export const buildApplicationExecutionScopeKernel = (
  input: ApplicationExecutionScopeBuildInput,
): ApplicationExecutionScopeKernel => {
  assertBuildInput(input);
  const assembly = input.agentToolMcpSessionAuthorities.begin({
    scopeIdentity: input.scopeIdentity,
  });
  let authority: ScopedAgentToolMcpSessionAuthority | null = null;
  let constructionCloseComplete = false;
  const abortConstruction = (): void => {
    if (constructionCloseComplete) return;
    constructionCloseComplete = true;
    if (authority) authority.close();
    else assembly.abort();
  };

  try {
    const storedTeamLocations =
      createStoredTeamRunExecutionTreeLocationService(input.memoryDir);
    const contextFileOwnerResolver = new ContextFileOwnerResolver({
      locations: storedTeamLocations,
    });
    const providerInputNormalizer = new AgentRunProviderInputNormalizer(
      new ContextFileLocalPathResolver({
        layout: new ContextFileLayout({
          appDataDir: input.contextFilePathEnvironment.appDataDir,
          memoryDir: input.memoryDir,
        }),
        ownerResolver: contextFileOwnerResolver,
        baseUrl: input.contextFilePathEnvironment.baseUrl,
      }),
    );
    const memoryLocationService = new AgentMemoryLocationService({
      memoryDir: input.memoryDir,
      locationService: storedTeamLocations,
    });
    const runFileChangeService = new RunFileChangeService({
      memoryDir: input.memoryDir,
      workspaceManager: input.workspaceManager,
      teamLocations: storedTeamLocations,
    });
    const relay = new ApplicationPublishedArtifactRelayService({
      bindingReader: input.bindingReader,
      artifactDeliverySink: input.artifactDeliverySink,
    });
    const memoryRecorder = new AgentRunMemoryRecorder();
    const resourceManager = new AgentRunResourceManager({
      runSessions: assembly.runSessions,
      runFileChangeService,
      publishedArtifactRelayService: relay,
      memoryRecorder,
    });
    const activationRegistry = new AgentRunActivationRegistry(resourceManager);
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const publicationService = new PublishedArtifactPublicationService({
      activeRunReader: activationRegistry,
      workspaceManager: input.workspaceManager,
      publishedArtifactRelayService: relay,
      projectionStore,
      snapshotStore,
    });
    authority = assembly.complete({
      executionCapabilities: {
        publishedArtifactPublisher: publicationService,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const providerFactories = input.agentProviderFactoryBuilder
      .createForExecution({
        agentDefinitionService: input.agentDefinitionService,
        agentToolMcpSessionIssuer: authority.issuer,
      });
    const agentRunManager = new AgentRunManager({
      autoByteusBackendFactory: providerFactories.autoByteus,
      codexBackendFactory: providerFactories.codex,
      claudeBackendFactory: providerFactories.claude,
      activationRegistry,
      memoryRecorder,
      providerInputNormalizer,
      agentToolMcpRunSessionReleaser: authority.runSessions,
    });
    const metadataService = new AgentRunMetadataService(input.memoryDir);
    const historyCatalogService = new AgentRunHistoryCatalogService(
      input.memoryDir,
      {
        agentDefinitionService: input.agentDefinitionService,
        agentRunManager,
      },
    );
    const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
      agentDefinitionService: input.agentDefinitionService,
      agentRunManager,
      agentRunMetadataService: metadataService,
      teamRunExecutionTreeLocationService: storedTeamLocations,
      memoryDir: input.memoryDir,
    });
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      agentRunIdentityAllocator,
    );
    const memberTeamContextBuilder = new MemberTeamContextBuilder(
      input.agentTeamDefinitionService,
    );
    const activityInspector = new AgentConversationActivityInspector();
    const teamRunManager = new AgentTeamRunManager({
      memoryDir: input.memoryDir,
      taskExecutionIdentity,
      modelConfigValidator: input.modelConfigValidator,
      mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
        agentToolMcpRunSessionReleaser: authority.runSessions,
        createTeamManager: (managerInput) =>
          new MixedTeamManager(managerInput.context, {
            subTeamRunFactory: managerInput.subTeamRunFactory,
            taskRootResolver: managerInput.callbacks.taskRootResolver,
            agentRunManager,
            agentToolMcpRunSessionReleaser:
              managerInput.agentToolMcpRunSessionReleaser,
            memoryLocationService,
            activityInspector,
            memberTeamContextBuilder,
            workspaceManager: input.workspaceManager,
            publish: managerInput.callbacks.publish,
            deliverInterAgentMessage:
              managerInput.callbacks.deliverInterAgentMessage,
            acceptPlatformBinding:
              managerInput.callbacks.acceptPlatformBinding,
          }),
      }),
      executionTreeStore: new TeamRunExecutionTreeStore(),
      taskRecordsStore: new TaskDelegationRecordsV1Store(),
      communicationStore: new TeamCommunicationV1Store(),
    });
    const { agentRunService, teamRunService } = buildRunServices(input, {
      memoryLocationService,
      activationRegistry,
      publicationService,
      projectionStore,
      snapshotStore,
      agentRunManager,
      teamRunManager,
      metadataService,
      historyCatalogService,
      agentRunIdentityAllocator,
    });
    const kernel = Object.freeze<ApplicationExecutionScopeKernel>({
      agentRunService,
      teamRunService,
      sessionAuthority: authority,
      shutdownCoordinator: new ApplicationExecutionShutdownCoordinator(
        teamRunManager,
        agentRunManager,
      ),
      streamSource: new ApplicationAgentStreamRuntimeSource({
        agentRunManager,
        teamRunManager,
      }),
      publicationService,
      projectionService: new PublishedArtifactProjectionService({
        activeRunReader: activationRegistry,
        metadataService,
        projectionStore,
        snapshotStore,
      }),
      memoryLocationService,
      abortConstruction,
    });
    return kernel;
  } catch (error) {
    try {
      abortConstruction();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Application execution scope construction failed.",
      );
    }
    throw error;
  }
};

const buildRunServices = (
  input: ApplicationExecutionScopeBuildInput,
  kernel: {
    memoryLocationService: AgentMemoryLocationService;
    activationRegistry: AgentRunActivationRegistry;
    publicationService: PublishedArtifactPublicationService;
    projectionStore: PublishedArtifactProjectionStore;
    snapshotStore: PublishedArtifactSnapshotStore;
    agentRunManager: AgentRunManager;
    teamRunManager: AgentTeamRunManager;
    metadataService: AgentRunMetadataService;
    historyCatalogService: AgentRunHistoryCatalogService;
    agentRunIdentityAllocator: AgentRunIdentityAllocator;
  },
) => {
  const { metadataService, historyCatalogService, agentRunIdentityAllocator } = kernel;
  const tokenUsageReadiness = new TokenUsageMigrationReadiness();
  const provisioningService = new AgentRunProvisioningService(
    input.memoryDir,
    {
      agentRunManager: kernel.agentRunManager,
      metadataService,
      historyCatalogService,
      workspaceManager: input.workspaceManager,
      agentRunIdentityAllocator,
    },
  );
  const lifecycleService = new StandaloneAgentRunLifecycleService(
    input.memoryDir,
    {
      agentRunManager: kernel.agentRunManager,
      metadataService,
      historyCatalogService,
      workspaceManager: input.workspaceManager,
      tokenUsageReadiness,
      modelConfigValidator: input.modelConfigValidator,
    },
  );
  const agentRunService = new AgentRunService(input.memoryDir, {
    agentRunManager: kernel.agentRunManager,
    metadataService,
    historyCatalogService,
    workspaceManager: input.workspaceManager,
    agentRunIdentityAllocator,
    provisioningService,
    lifecycleService,
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager: kernel.teamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    agentRunIdentityAllocator,
    teamRunIdentityAllocator: new TeamRunIdentityAllocator(),
    teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(
      input.memoryDir,
      { teamRunManager: kernel.teamRunManager },
    ),
    workspaceManager: input.workspaceManager,
    memoryDir: input.memoryDir,
    memoryLocationService: kernel.memoryLocationService,
    tokenUsageReadiness,
  });
  return { agentRunService, teamRunService, metadataService };
};

const assertBuildInput = (input: ApplicationExecutionScopeBuildInput): void => {
  if (!input || typeof input !== "object") {
    throw new Error("Application execution scope input is required.");
  }
  if (typeof input.scopeIdentity !== "string" || !input.scopeIdentity.trim()) {
    throw new Error("Application execution scope identity is required.");
  }
  if (typeof input.memoryDir !== "string" || !input.memoryDir.trim()) {
    throw new Error("Application execution memory directory is required.");
  }
  if (
    !input.contextFilePathEnvironment
    || typeof input.contextFilePathEnvironment.appDataDir !== "string"
    || !input.contextFilePathEnvironment.appDataDir.trim()
    || typeof input.contextFilePathEnvironment.baseUrl !== "string"
    || !input.contextFilePathEnvironment.baseUrl.trim()
  ) {
    throw new Error("Application execution context-file path environment is required.");
  }
  for (const field of [
    "agentDefinitionService",
    "agentTeamDefinitionService",
    "agentToolMcpSessionAuthorities",
    "agentProviderFactoryBuilder",
    "workspaceManager",
    "bindingReader",
    "artifactDeliverySink",
    "modelConfigValidator",
  ] as const) {
    if (input[field] == null) {
      throw new Error(`Application execution scope ${field} is required.`);
    }
  }
};
