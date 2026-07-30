import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationStorageLifecycleService } from "../../application-storage/services/application-storage-lifecycle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationGlobalPlatformStateStore } from "../../application-storage/stores/application-global-platform-state-store.js";
import type { ApplicationRunLookupStore } from "../../application-orchestration/stores/application-run-lookup-store.js";
import type { ApplicationOrchestrationStartupGate } from "../../application-orchestration/services/application-orchestration-startup-gate.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationOrchestrationRecoveryService } from "../../application-orchestration/services/application-orchestration-recovery-service.js";
import type { ApplicationExecutionEventDispatchService } from "../../application-orchestration/services/application-execution-event-dispatch-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import type { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import type { ApplicationEngineHostService } from "../../application-engine/services/application-engine-host-service.js";
import type { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import type { ApplicationBackendWebSocketSessionService } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";
import type {
  ApplicationAgentToolsSessionAuthority,
} from "../../agent-tools/mcp/application-agent-tools-session-authority.js";
import type {
  PublishedArtifactPublicationService,
} from "../../services/published-artifacts/published-artifact-publication-service.js";

export type ApplicationPlatformRuntimeGraph = Readonly<{
  bundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  platformStateStore: ApplicationPlatformStateStore;
  globalPlatformStateStore: ApplicationGlobalPlatformStateStore;
  runLookupStore: ApplicationRunLookupStore;
  agentToolsSessionAuthority: ApplicationAgentToolsSessionAuthority;
  publishedArtifactPublicationService: PublishedArtifactPublicationService;
  startupGate: ApplicationOrchestrationStartupGate;
  availabilityService: ApplicationAvailabilityService;
  recoveryService: ApplicationOrchestrationRecoveryService;
  eventDispatchService: ApplicationExecutionEventDispatchService;
  orchestrationHostService: ApplicationOrchestrationHostService;
  agentStreamingService: ApplicationAgentStreamingService;
  agentCommunicationService: ApplicationAgentCommunicationService;
  engineHostService: ApplicationEngineHostService;
  notificationHub: ApplicationBackendNotificationHub;
  backendWebSocketSessionService: ApplicationBackendWebSocketSessionService;
  backendGateway: ApplicationBackendApiGatewayService;
  lifecycle: ApplicationPlatformLifecycle;
}>;
