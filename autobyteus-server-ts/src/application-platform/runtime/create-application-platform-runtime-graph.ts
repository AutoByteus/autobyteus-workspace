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
import type { ApplicationPlatformRuntimeGraph } from "./application-platform-runtime-graph.js";
import { createApplicationOrchestrationAuthorities } from "./create-application-orchestration-authorities.js";
import { DeferredApplicationEngineEventHandlerPort } from "./deferred-application-engine-event-handler-port.js";
import { DeferredPublishedArtifactPublicationPort } from "./deferred-published-artifact-publication-port.js";
import type {
  ApplicationAgentToolsSessionAuthorityFactory,
} from "../../agent-tools/mcp/agent-tools-mcp-process-authority.js";

export const createApplicationPlatformRuntimeGraph = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionAuthorityFactory:
    ApplicationAgentToolsSessionAuthorityFactory;
  selectedApplicationIds?: ReadonlySet<string> | null;
}): ApplicationPlatformRuntimeGraph => {
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
  const deferredEnginePort = new DeferredApplicationEngineEventHandlerPort();
  const deferredPublicationPort =
    new DeferredPublishedArtifactPublicationPort();
  const agentToolsSessionAuthority =
    input.agentToolsSessionAuthorityFactory
      .createApplicationSessionAuthority({
        executionAuthorities: {
          publishedArtifactPublication: deferredPublicationPort,
        },
        assertExecutionAuthoritiesReady: () =>
          deferredPublicationPort.assertBound(),
      });
  const authorities = createApplicationOrchestrationAuthorities({
    ...input,
    platformStateStore,
    globalPlatformStateStore,
    availabilityRegistry,
    deferredEnginePort,
    agentToolsSessionAuthority,
  });
  deferredPublicationPort.bind(authorities.publicationService);
  const engineHostService = new ApplicationEngineHostService({
    applicationBundleService: input.bundleService,
    storageLifecycleService,
    orchestrationHostService: authorities.orchestrationHostService,
    agentStreamingService: authorities.agentStreamingService,
  });
  deferredEnginePort.bind(engineHostService);

  const notificationHub = new ApplicationBackendNotificationHub();
  const backendWebSocketSessionService = new ApplicationBackendWebSocketSessionService({
    engineHostService,
  });
  const backendGateway = new ApplicationBackendApiGatewayService({
    applicationBundleService: input.bundleService,
    availabilityService: authorities.availabilityService,
    engineHostService,
    notificationHub,
    webSocketSessionService: backendWebSocketSessionService,
  });
  const definitionRuntimeReadiness = new ApplicationDefinitionRuntimeReadiness({
    bundleService: input.bundleService,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    configurationService: authorities.configurationService,
    executionResourceResolver: authorities.executionResourceResolver,
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
        publishedArtifactPublicationService: authorities.publicationService,
      }),
      bootstrapBuiltInAgents: async () => {
        await bootstrapBuiltInAgents({
          agentsDir: input.appConfig.getAgentsDir(),
          agentDefinitionService: input.agentDefinitionService,
        });
      },
      definitionRuntimeReadiness,
      agentToolsSessionAuthority,
      publishedArtifactPublicationPort: deferredPublicationPort,
    },
    bundleService: input.bundleService,
    platformStateStore,
    recoveryService: authorities.recoveryService,
    availabilityService: authorities.availabilityService,
    eventDispatchService: authorities.eventDispatchService,
    startupGate: authorities.startupGate,
    selectedApplicationIds: input.selectedApplicationIds,
    agentCommunicationService: authorities.agentCommunicationService,
    backendGateway,
    backendWebSocketSessionService,
    notificationHub,
    runObserverService: authorities.runObserverService,
    engineHostService,
    runShutdownAuthority: authorities.runShutdownAuthority,
    streamingService: authorities.agentStreamingService,
  });

  return Object.freeze({
    bundleService: input.bundleService,
    storageLifecycleService,
    platformStateStore,
    globalPlatformStateStore,
    runLookupStore: authorities.runLookupStore,
    agentToolsSessionAuthority,
    publishedArtifactPublicationService: authorities.publicationService,
    startupGate: authorities.startupGate,
    availabilityService: authorities.availabilityService,
    recoveryService: authorities.recoveryService,
    eventDispatchService: authorities.eventDispatchService,
    orchestrationHostService: authorities.orchestrationHostService,
    agentStreamingService: authorities.agentStreamingService,
    agentCommunicationService: authorities.agentCommunicationService,
    engineHostService,
    notificationHub,
    backendWebSocketSessionService,
    backendGateway,
    lifecycle,
  });
};
