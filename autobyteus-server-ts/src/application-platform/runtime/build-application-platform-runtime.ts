import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { ApplicationBackendWebSocketSessionService } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import { ApplicationExecutionEventDispatchQueue } from "../../application-orchestration/services/application-execution-event-dispatch-queue.js";
import { ApplicationPublishedArtifactDeliveryQueue } from "../../application-orchestration/services/application-published-artifact-delivery-queue.js";
import { ApplicationStorageLifecycleService } from "../../application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationGlobalPlatformStateStore } from "../../application-storage/stores/application-global-platform-state-store.js";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import { ApplicationExecutionEventJournalStore } from "../../application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationLaunchOverrideStore } from "../../application-orchestration/stores/application-launch-override-store.js";
import { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../application-orchestration/stores/application-run-lookup-store.js";
import { AgentToolRegistryReadiness } from "../../startup/agent-tool-loader.js";
import { loadAgentCustomizations } from "../../startup/agent-customization-loader.js";
import { loadWorkspaces } from "../../startup/workspace-loader.js";
import { bootstrapBuiltInAgents } from "../../built-in-agents/built-in-agent-bootstrapper.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { ApplicationAvailabilityStateRegistry } from "./application-availability-state-registry.js";
import { ApplicationCatalogReconciliationService } from "./application-catalog-reconciliation-service.js";
import { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";
import type { ApplicationPlatformRuntime } from "./application-platform-runtime.js";
import { createApplicationOrchestrationServices } from "./create-application-orchestration-services.js";
import type { AgentToolMcpSessionAuthorityFactory } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentProviderFactoryBuilder } from "../../agent-execution/providers/agent-provider-factory-builder.js";
import { ApplicationExecutionScope } from "../execution/application-execution-scope.js";
import type { ApplicationExecutionScopeIdentity } from "../execution/application-execution-scope-contracts.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type { ModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import type { ModelAvailabilityService } from "../../llm-management/services/model-availability-service.js";
import type { LlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import type { CodexAppServerClientManager } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { ContextFilePathEnvironment } from "../../context-files/domain/context-file-path-environment.js";
import type { RunModelConfigValidator } from "../../llm-management/services/model-config-validation-service.js";

export type ApplicationPlatformBuildInput = Readonly<{
  appConfig: AppConfig;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  bundleService: ApplicationBundleService;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolMcpSessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  workspaceManager: WorkspaceManager;
  runtimeAvailabilityService: RuntimeAvailabilityService;
  modelCatalogService: ModelCatalogService;
  modelAvailabilityService: ModelAvailabilityService;
  llmProviderService: LlmProviderService;
  codexClientManager: CodexAppServerClientManager;
  requireCurrentModelIdentifier: (modelIdentifier: string) => Promise<void>;
  modelConfigValidator: RunModelConfigValidator;
  selectedApplicationIds?: ReadonlySet<string> | null;
}>;

export const buildApplicationPlatformRuntime = (
  input: ApplicationPlatformBuildInput,
): ApplicationPlatformRuntime => {
  const storageLifecycleService = new ApplicationStorageLifecycleService({
    appConfig: input.appConfig,
    applicationBundleService: input.bundleService,
  });
  const platformStateStore = new ApplicationPlatformStateStore({
    appConfig: input.appConfig,
    storageLifecycleService,
  });
  const globalPlatformStateStore = new ApplicationGlobalPlatformStateStore(
    input.appConfig,
  );
  const availabilityRegistry = new ApplicationAvailabilityStateRegistry();
  const engineController = new ApplicationEngineController();
  const eventDispatchQueue = new ApplicationExecutionEventDispatchQueue();
  const artifactDeliveryQueue = new ApplicationPublishedArtifactDeliveryQueue();
  const runLookupStore = new ApplicationRunLookupStore({ globalPlatformStateStore });
  const bindingStore = new ApplicationRunBindingStore({ platformStateStore });
  const overrideStore = new ApplicationLaunchOverrideStore({ platformStateStore });
  const journalStore = new ApplicationExecutionEventJournalStore({ platformStateStore });
  const scopeIdentity: ApplicationExecutionScopeIdentity = input.selectedApplicationIds
    ? `application:${Array.from(input.selectedApplicationIds).sort().join(",")}`
    : "application:studio";
  const executionScope = ApplicationExecutionScope.create({
    scopeIdentity,
    memoryDir: input.appConfig.getMemoryDir(),
    contextFilePathEnvironment: input.contextFilePathEnvironment,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    agentToolMcpSessionAuthorities: input.agentToolMcpSessionAuthorities,
    agentProviderFactoryBuilder: input.agentProviderFactoryBuilder,
    workspaceManager: input.workspaceManager,
    bindingReader: bindingStore,
    artifactDeliverySink: artifactDeliveryQueue,
    modelConfigValidator: input.modelConfigValidator,
  });
  try {
    const services = createApplicationOrchestrationServices({
    appConfig: input.appConfig,
    bundleService: input.bundleService,
    storageLifecycleService,
    platformStateStore,
    availabilityRegistry,
    engineController,
    eventDispatchQueue,
    artifactDeliveryQueue,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    runLookupStore,
    bindingStore,
    overrideStore,
    journalStore,
    agentExecution: executionScope.agentExecution,
    teamExecution: executionScope.teamExecution,
    streaming: executionScope.streaming,
    artifacts: executionScope.artifacts,
    memory: executionScope.memory,
    runtimeAvailabilityService: input.runtimeAvailabilityService,
    modelCatalogService: input.modelCatalogService,
    modelAvailabilityService: input.modelAvailabilityService,
    llmProviderService: input.llmProviderService,
    codexClientManager: input.codexClientManager,
    requireCurrentModelIdentifier: input.requireCurrentModelIdentifier,
    skillService: new SkillService({ config: input.appConfig }),
    selectedApplicationIds: input.selectedApplicationIds,
    });
    const notificationHub = new ApplicationBackendNotificationHub();
    const backendWebSocketSessionService = new ApplicationBackendWebSocketSessionService({
      engineController,
      engineLauncher: services.engineLauncher,
    });
    const backendGateway = new ApplicationBackendApiGatewayService({
      applicationBundleService: input.bundleService,
      availabilityService: services.availabilityService,
      engineController,
      engineLauncher: services.engineLauncher,
      notificationHub,
      webSocketSessionService: backendWebSocketSessionService,
    });
    const catalogReconciliation = new ApplicationCatalogReconciliationService({
      platformStateStore,
      availabilityService: services.availabilityService,
    });
    const lifecycle = new ApplicationPlatformLifecycle({
      preparation: {
        prepareWorkspaceRuntime: async () => {
          await loadWorkspaces();
          await input.workspaceManager.getOrCreateTempWorkspace();
        },
        prepareAgentCustomizations: async () => loadAgentCustomizations(),
        toolReadiness: new AgentToolRegistryReadiness({
          publishedArtifactPublicationService:
            executionScope.toolReadiness.publishedArtifactPublisher,
        }),
        bootstrapBuiltInAgents: async () => {
          await bootstrapBuiltInAgents({
            agentsDir: input.appConfig.getAgentsDir(),
            agentDefinitionService: input.agentDefinitionService,
          });
        },
        definitionRuntimeReadiness: services.definitionRuntimeReadiness,
      },
      executionReadiness: executionScope.toolReadiness,
      bundleService: input.bundleService,
      storageLifecycleService,
      platformStateStore,
      recoveryService: services.recoveryService,
      availabilityService: services.availabilityService,
      eventDispatchService: services.eventDispatchService,
      startupGate: services.startupGate,
      selectedApplicationIds: input.selectedApplicationIds,
      agentCommunicationService: services.agentCommunicationService,
      backendGateway,
      backendWebSocketSessionService,
      notificationHub,
      runObserverService: services.runObserverService,
      artifactDeliveryService: services.artifactDeliveryService,
      engineLauncher: services.engineLauncher,
      executionLifecycle: executionScope.lifecycle,
      streamingService: services.agentStreamingService,
    });

    return Object.freeze({
      lifecycle,
      rest: Object.freeze({
        assets: Object.freeze({
          resolveUiAsset: (applicationId: string, relativePath: string) =>
            input.bundleService.resolveUiAsset(applicationId, relativePath),
        }),
        backend: Object.freeze({
          getApplicationEngineStatus: (applicationId: string) =>
            backendGateway.getApplicationEngineStatus(applicationId),
          ensureApplicationReady: (applicationId: string) =>
            backendGateway.ensureApplicationReady(applicationId),
          invokeApplicationQuery: backendGateway.invokeApplicationQuery.bind(backendGateway),
          invokeApplicationCommand: backendGateway.invokeApplicationCommand.bind(backendGateway),
          routeApplicationRequest: backendGateway.routeApplicationRequest.bind(backendGateway),
          executeApplicationGraphql: backendGateway.executeApplicationGraphql.bind(backendGateway),
        }),
        availability: Object.freeze({
          reloadAndReenter: services.reentryService.reloadAndReenter
            .bind(services.reentryService),
        }),
        executionResources: Object.freeze({
          getApplicationLaunchConfigurationView: services.orchestrationHostService
            .getApplicationLaunchConfigurationView.bind(services.orchestrationHostService),
          previewSelectedApplicationResource: services.orchestrationHostService
            .previewSelectedApplicationResource.bind(services.orchestrationHostService),
          listAvailableExecutionResources: services.orchestrationHostService
            .listAvailableExecutionResources.bind(services.orchestrationHostService),
          upsertApplicationLaunchOverride: services.orchestrationHostService
            .upsertApplicationLaunchOverride.bind(services.orchestrationHostService),
          removeApplicationLaunchOverride: services.orchestrationHostService
            .removeApplicationLaunchOverride.bind(services.orchestrationHostService),
        }),
      }),
      realtime: Object.freeze({
        backend: Object.freeze({
          connectApplicationWebSocket: backendGateway.connectApplicationWebSocket
            .bind(backendGateway),
        }),
        notifications: Object.freeze({
          connect: notificationHub.connect.bind(notificationHub),
          disconnect: notificationHub.disconnect.bind(notificationHub),
        }),
        agentCommunication: Object.freeze({
          connect: services.agentCommunicationService.connect
            .bind(services.agentCommunicationService),
        }),
      }),
      hostManagement: Object.freeze({
        catalogReconciliation,
        runOwnership: services.runOwnershipService,
      }),
    });
  } catch (error) {
    try {
      executionScope.abortConstruction();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Application platform runtime construction failed.",
      );
    }
    throw error;
  }
};
