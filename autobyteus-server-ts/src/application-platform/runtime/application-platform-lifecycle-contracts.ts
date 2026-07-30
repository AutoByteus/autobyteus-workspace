import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationOrchestrationRecoveryService } from "../../application-orchestration/services/application-orchestration-recovery-service.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationExecutionEventDispatchService } from "../../application-orchestration/services/application-execution-event-dispatch-service.js";
import type { ApplicationOrchestrationStartupGate } from "../../application-orchestration/services/application-orchestration-startup-gate.js";
import type { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { ApplicationBackendWebSocketSessionService } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import type { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import type { ApplicationRunObserverService } from "../../application-orchestration/services/application-run-observer-service.js";
import type { ApplicationEngineHostService } from "../../application-engine/services/application-engine-host-service.js";
import type { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import type { AgentToolRegistryReadiness } from "../../startup/agent-tool-loader.js";
import type { ApplicationDefinitionRuntimeReadiness } from "./application-definition-runtime-readiness.js";
import type {
  ScopedAgentToolMcpSessionManager,
} from "../../agent-tools/mcp/scoped-agent-tool-mcp-session-manager.js";
import type {
  BindOncePublishedArtifactPublisher,
} from "./bind-once-published-artifact-publisher.js";
import type {
  ApplicationRunShutdownCoordinator,
} from "./application-run-shutdown-coordinator.js";

export type ApplicationPlatformLifecycleState =
  | "constructed"
  | "preparing_runtime"
  | "catalog_ready"
  | "waiting_for_listener"
  | "recovering"
  | "ready"
  | "stopping"
  | "stopped"
  | "failed";

export type ApplicationPlatformLifecycleDependencies = {
  preparation: {
    prepareWorkspaceRuntime: () => Promise<void>;
    prepareAgentCustomizations: () => Promise<void>;
    toolReadiness: AgentToolRegistryReadiness;
    bootstrapBuiltInAgents: () => Promise<void>;
    definitionRuntimeReadiness: ApplicationDefinitionRuntimeReadiness;
    agentToolsSessionManager: ScopedAgentToolMcpSessionManager;
    publishedArtifactPublisher:
      BindOncePublishedArtifactPublisher;
  };
  bundleService: ApplicationBundleService;
  platformStateStore: ApplicationPlatformStateStore;
  recoveryService: ApplicationOrchestrationRecoveryService;
  availabilityService: ApplicationAvailabilityService;
  eventDispatchService: ApplicationExecutionEventDispatchService;
  startupGate: ApplicationOrchestrationStartupGate;
  selectedApplicationIds?: ReadonlySet<string> | null;
  agentCommunicationService: ApplicationAgentCommunicationService;
  backendGateway: ApplicationBackendApiGatewayService;
  backendWebSocketSessionService: ApplicationBackendWebSocketSessionService;
  notificationHub: ApplicationBackendNotificationHub;
  runObserverService: ApplicationRunObserverService;
  engineHostService: ApplicationEngineHostService;
  runShutdownCoordinator: ApplicationRunShutdownCoordinator;
  streamingService: ApplicationAgentStreamingService;
};
