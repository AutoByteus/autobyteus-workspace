import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import type { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationReentryService } from "../../application-orchestration/services/application-reentry-service.js";
import type { ApplicationRunOwnershipReader } from "../../application-orchestration/services/application-run-ownership-service.js";
import type { ApplicationCatalogReconciliationService } from "./application-catalog-reconciliation-service.js";
import type { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";

export type ApplicationPlatformLifecycleReadiness = Pick<
  ApplicationPlatformLifecycle,
  "awaitReady" | "getState" | "getFailure"
>;

export type ApplicationBackendRestContract = Pick<
  ApplicationBackendApiGatewayService,
  | "getApplicationEngineStatus"
  | "ensureApplicationReady"
  | "invokeApplicationQuery"
  | "invokeApplicationCommand"
  | "routeApplicationRequest"
  | "executeApplicationGraphql"
>;

export type ApplicationAvailabilityRestContract = Pick<
  ApplicationReentryService,
  "reloadAndReenter"
>;

export type ApplicationExecutionResourceRestContract = Pick<
  ApplicationOrchestrationHostService,
  | "getApplicationLaunchConfigurationView"
  | "previewSelectedApplicationResource"
  | "listAvailableExecutionResources"
  | "upsertApplicationLaunchOverride"
  | "removeApplicationLaunchOverride"
>;

export type ApplicationPlatformRestContracts = Readonly<{
  assets: Pick<ApplicationBundleService, "resolveUiAsset">;
  backend: ApplicationBackendRestContract;
  availability: ApplicationAvailabilityRestContract;
  executionResources: ApplicationExecutionResourceRestContract;
}>;

export type ApplicationBackendRealtimeContract = Pick<
  ApplicationBackendApiGatewayService,
  "connectApplicationWebSocket"
>;

export type ApplicationBackendNotificationContract = Pick<
  ApplicationBackendNotificationHub,
  "connect" | "disconnect"
>;

export type ApplicationAgentCommunicationContract = Pick<
  ApplicationAgentCommunicationService,
  "connect"
>;

export type ApplicationPlatformRealtimeContracts = Readonly<{
  backend: ApplicationBackendRealtimeContract;
  notifications: ApplicationBackendNotificationContract;
  agentCommunication: ApplicationAgentCommunicationContract;
}>;

export type ApplicationPlatformHostManagementContracts = Readonly<{
  catalogReconciliation: ApplicationCatalogReconciliationService;
  runOwnership: ApplicationRunOwnershipReader;
}>;
