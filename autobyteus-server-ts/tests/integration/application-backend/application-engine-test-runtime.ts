import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { ApplicationBackendNotificationHub } from "../../../src/application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import { ApplicationBackendApiGatewayService } from "../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { ApplicationBackendWebSocketSessionService } from "../../../src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import type { ApplicationAgentStreamingService } from "../../../src/application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationEngineController } from "../../../src/application-engine/services/application-engine-controller.js";
import { ApplicationEngineLauncher } from "../../../src/application-engine/services/application-engine-launcher.js";
import type { ApplicationAvailabilityService } from "../../../src/application-orchestration/services/application-availability-service.js";
import type { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";

export const createApplicationEngineTestRuntime = (input: {
  applicationBundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  availabilityService?: ApplicationAvailabilityService;
  orchestrationHostService?: ApplicationOrchestrationHostService;
  agentStreamingService?: ApplicationAgentStreamingService;
  notificationHub?: ApplicationBackendNotificationHub;
  engineController?: ApplicationEngineController;
}) => {
  const engineController = input.engineController ?? new ApplicationEngineController();
  const engineLauncher = new ApplicationEngineLauncher({
    applicationBundleService: input.applicationBundleService,
    storageLifecycleService: input.storageLifecycleService,
    orchestrationHostService: input.orchestrationHostService ?? ({} as ApplicationOrchestrationHostService),
    agentStreamingService: input.agentStreamingService ?? ({
      stopApplication: () => undefined,
    } as unknown as ApplicationAgentStreamingService),
    controller: engineController,
  });
  const backendWebSocketSessionService = new ApplicationBackendWebSocketSessionService({
    engineController,
    engineLauncher,
  });
  const notificationHub = input.notificationHub ?? new ApplicationBackendNotificationHub();
  const backendGateway = new ApplicationBackendApiGatewayService({
    applicationBundleService: input.applicationBundleService,
    availabilityService: input.availabilityService ?? ({
      requireApplicationActive: async () => undefined,
    } as ApplicationAvailabilityService),
    engineController,
    engineLauncher,
    notificationHub,
    webSocketSessionService: backendWebSocketSessionService,
  });

  return {
    engineController,
    engineLauncher,
    backendWebSocketSessionService,
    notificationHub,
    backendGateway,
  };
};
