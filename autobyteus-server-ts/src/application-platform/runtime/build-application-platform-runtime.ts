import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { ApplicationBackendWebSocketSessionService } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import { ApplicationEngineHostService } from "../../application-engine/services/application-engine-host-service.js";
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
import { ApplicationDefinitionRuntimeReadiness } from "./application-definition-runtime-readiness.js";
import { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";
import type { ApplicationPlatformRuntime } from "./application-platform-runtime.js";
import { createApplicationOrchestrationServices } from "./create-application-orchestration-services.js";
import { BindOnceApplicationEngineEventHandler } from "./bind-once-application-engine-event-handler.js";
import { BindOncePublishedArtifactPublisher } from "./bind-once-published-artifact-publisher.js";
import type {
  ApplicationAgentToolsSessionManagerFactory,
} from "../../agent-tools/mcp/agent-tools-mcp-runtime.js";

export const buildApplicationPlatformRuntime = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionManagerFactory:
    ApplicationAgentToolsSessionManagerFactory;
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
  const globalPlatformStateStore = new ApplicationGlobalPlatformStateStore(input.appConfig);
  const availabilityRegistry = new ApplicationAvailabilityStateRegistry();
  const bindOnceApplicationEngineEventHandler =
    new BindOnceApplicationEngineEventHandler();
  const bindOncePublishedArtifactPublisher =
    new BindOncePublishedArtifactPublisher();
  const agentToolsSessionManager =
    input.agentToolsSessionManagerFactory
      .createApplicationSessionManager({
        executionCapabilities: {
          publishedArtifactPublisher: bindOncePublishedArtifactPublisher,
        },
        assertExecutionCapabilitiesReady: () =>
          bindOncePublishedArtifactPublisher.assertBound(),
      });
  const services = createApplicationOrchestrationServices({
    ...input,
    platformStateStore,
    globalPlatformStateStore,
    availabilityRegistry,
    bindOnceApplicationEngineEventHandler,
    agentToolsSessionManager,
  });
  bindOncePublishedArtifactPublisher.bind(services.publicationService);
  const engineHostService = new ApplicationEngineHostService({
    applicationBundleService: input.bundleService,
    storageLifecycleService,
    orchestrationHostService: services.orchestrationHostService,
    agentStreamingService: services.agentStreamingService,
  });
  bindOnceApplicationEngineEventHandler.bind(engineHostService);

  const notificationHub = new ApplicationBackendNotificationHub();
  const backendWebSocketSessionService = new ApplicationBackendWebSocketSessionService({
    engineHostService,
  });
  const backendGateway = new ApplicationBackendApiGatewayService({
    applicationBundleService: input.bundleService,
    availabilityService: services.availabilityService,
    engineHostService,
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
      agentToolsSessionManager,
      publishedArtifactPublisher: bindOncePublishedArtifactPublisher,
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
    engineHostService,
    runShutdownCoordinator: services.runShutdownCoordinator,
    streamingService: services.agentStreamingService,
  });

  return Object.freeze({
    bundleService: input.bundleService,
    storageLifecycleService,
    platformStateStore,
    globalPlatformStateStore,
    runLookupStore: services.runLookupStore,
    agentToolsSessionManager,
    publishedArtifactPublicationService: services.publicationService,
    startupGate: services.startupGate,
    availabilityService: services.availabilityService,
    recoveryService: services.recoveryService,
    eventDispatchService: services.eventDispatchService,
    orchestrationHostService: services.orchestrationHostService,
    agentStreamingService: services.agentStreamingService,
    agentCommunicationService: services.agentCommunicationService,
    engineHostService,
    notificationHub,
    backendWebSocketSessionService,
    backendGateway,
    lifecycle,
  });
};
