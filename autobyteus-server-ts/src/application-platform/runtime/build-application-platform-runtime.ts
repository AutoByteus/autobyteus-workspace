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
import { AgentToolRegistryReadiness } from "../../startup/agent-tool-loader.js";
import { loadAgentCustomizations } from "../../startup/agent-customization-loader.js";
import { loadWorkspaces } from "../../startup/workspace-loader.js";
import { bootstrapBuiltInAgents } from "../../built-in-agents/built-in-agent-bootstrapper.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { ApplicationAvailabilityStateRegistry } from "./application-availability-state-registry.js";
import { ApplicationCatalogReconciliationService } from "./application-catalog-reconciliation-service.js";
import { ApplicationDefinitionRuntimeReadiness } from "./application-definition-runtime-readiness.js";
import { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";
import type { ApplicationPlatformRuntime } from "./application-platform-runtime.js";
import { createApplicationOrchestrationServices } from "./create-application-orchestration-services.js";
import type { ApplicationAgentToolsSessionFactory } from "../../agent-tools/mcp/agent-tools-mcp-runtime.js";

export const buildApplicationPlatformRuntime = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
  selectedApplicationIds?: ReadonlySet<string> | null;
}): ApplicationPlatformRuntime => {
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
  const scopeIdentity = input.selectedApplicationIds
    ? `application:${Array.from(input.selectedApplicationIds).sort().join(",")}`
    : "application:studio";
  const sessionScope = input.agentToolsSessionFactory
    .createApplicationSessionScope(scopeIdentity);
  const services = createApplicationOrchestrationServices({
    ...input,
    storageLifecycleService,
    platformStateStore,
    globalPlatformStateStore,
    availabilityRegistry,
    engineController,
    eventDispatchQueue,
    artifactDeliveryQueue,
    sessionScope,
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
  const definitionRuntimeReadiness = new ApplicationDefinitionRuntimeReadiness({
    bundleService: input.bundleService,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    configurationService: services.configurationService,
    executionResourceResolver: services.executionResourceResolver,
    skillService: new SkillService({ config: input.appConfig }),
    activeApplicationIds: input.selectedApplicationIds,
  });
  const catalogReconciliation = new ApplicationCatalogReconciliationService({
    platformStateStore,
    availabilityService: services.availabilityService,
  });
  const lifecycle = new ApplicationPlatformLifecycle({
    preparation: {
      prepareWorkspaceRuntime: async () => {
        await loadWorkspaces();
        await getWorkspaceManager().getOrCreateTempWorkspace();
      },
      prepareAgentCustomizations: async () => loadAgentCustomizations(),
      toolReadiness: new AgentToolRegistryReadiness({
        publishedArtifactPublicationService: services.publicationService,
      }),
      bootstrapBuiltInAgents: async () => {
        await bootstrapBuiltInAgents({
          agentsDir: input.appConfig.getAgentsDir(),
          agentDefinitionService: input.agentDefinitionService,
        });
      },
      definitionRuntimeReadiness,
      agentToolsSessionManager: services.agentToolsSessionManager,
    },
    bundleService: input.bundleService,
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
    runShutdownCoordinator: services.runShutdownCoordinator,
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
    hostManagement: Object.freeze({ catalogReconciliation }),
  });
};
