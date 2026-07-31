import type {
  ApplicationEngineStatus,
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationWebSocketRequest,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import type { ApplicationBackendNotificationHub } from "../notifications/application-backend-notification-hub.js";
import {
  ApplicationBackendWebSocketSessionService,
  type ApplicationBackendNetworkWebSocket,
} from "../websockets/application-backend-websocket-session-service.js";

const normalizeRequestContext = (
  applicationId: string,
  requestContext?: ApplicationRequestContext | null,
): ApplicationRequestContext => {
  if (!requestContext) {
    return { applicationId };
  }
  if (requestContext.applicationId !== applicationId) {
    throw new Error("requestContext.applicationId must match the route applicationId.");
  }
  return { applicationId };
};

export class ApplicationBackendApiGatewayService {
  private subscribedToEngineNotifications = false;
  private unsubscribeEngineNotifications: (() => void) | null = null;

  constructor(
    private readonly dependencies: {
      applicationBundleService: ApplicationBundleService;
      availabilityService: ApplicationAvailabilityService;
      engineController: ApplicationEngineController;
      engineLauncher: ApplicationEngineLauncher;
      notificationHub: ApplicationBackendNotificationHub;
      webSocketSessionService: ApplicationBackendWebSocketSessionService;
    },
  ) {
    this.ensureNotificationBridge();
  }

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService;
  }

  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService;
  }

  private get engineController(): ApplicationEngineController {
    return this.dependencies.engineController;
  }

  private get engineLauncher(): ApplicationEngineLauncher {
    return this.dependencies.engineLauncher;
  }

  private get notificationHub(): ApplicationBackendNotificationHub {
    return this.dependencies.notificationHub;
  }

  private get webSocketSessionService(): ApplicationBackendWebSocketSessionService {
    return this.dependencies.webSocketSessionService;
  }

  private ensureNotificationBridge(): void {
    if (this.subscribedToEngineNotifications) {
      return;
    }
    if (typeof (this.engineController as { onNotification?: unknown }).onNotification !== "function") {
      return;
    }
    this.subscribedToEngineNotifications = true;
    this.unsubscribeEngineNotifications = this.engineController.onNotification(({ applicationId, message }) => {
      this.notificationHub.publish({
        applicationId,
        topic: message.topic,
        payload: message.payload,
        publishedAt: message.publishedAt,
      });
    });
  }

  private async requireApplication(applicationId: string) {
    await this.availabilityService.requireApplicationActive(applicationId);
    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (!application) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }
    return application;
  }

  private async requireApplicationWebSocketExposure(applicationId: string): Promise<void> {
    const application = await this.requireApplication(applicationId);
    if (!application.backend.supportedExposures.webSockets) {
      throw new Error(`Application '${applicationId}' does not support backend WebSockets.`);
    }
  }

  async getApplicationEngineStatus(applicationId: string): Promise<ApplicationEngineStatus> {
    await this.requireApplication(applicationId);
    return this.engineController.getStatus(applicationId);
  }

  async ensureApplicationReady(applicationId: string): Promise<ApplicationEngineStatus> {
    await this.requireApplication(applicationId);
    return this.engineLauncher.ensureReady(applicationId);
  }

  async invokeApplicationQuery(
    applicationId: string,
    queryName: string,
    requestContext: ApplicationRequestContext | null,
    input: unknown,
  ): Promise<unknown> {
    await this.requireApplication(applicationId);
    await this.engineLauncher.ensureReady(applicationId);
    return this.engineController.invokeApplicationQuery(applicationId, {
      queryName,
      requestContext: normalizeRequestContext(applicationId, requestContext),
      input,
    });
  }

  async invokeApplicationCommand(
    applicationId: string,
    commandName: string,
    requestContext: ApplicationRequestContext | null,
    input: unknown,
  ): Promise<unknown> {
    await this.requireApplication(applicationId);
    await this.engineLauncher.ensureReady(applicationId);
    return this.engineController.invokeApplicationCommand(applicationId, {
      commandName,
      requestContext: normalizeRequestContext(applicationId, requestContext),
      input,
    });
  }

  async routeApplicationRequest(
    applicationId: string,
    requestContext: ApplicationRequestContext | null,
    request: ApplicationRouteRequest,
  ): Promise<unknown> {
    await this.requireApplication(applicationId);
    await this.engineLauncher.ensureReady(applicationId);
    return this.engineController.routeApplicationRequest(applicationId, {
      requestContext: normalizeRequestContext(applicationId, requestContext),
      request,
    });
  }

  async executeApplicationGraphql(
    applicationId: string,
    requestContext: ApplicationRequestContext | null,
    request: ApplicationGraphqlRequest,
  ): Promise<unknown> {
    await this.requireApplication(applicationId);
    await this.engineLauncher.ensureReady(applicationId);
    return this.engineController.executeApplicationGraphql(applicationId, {
      requestContext: normalizeRequestContext(applicationId, requestContext),
      request,
    });
  }

  connectApplicationWebSocket(input: {
    applicationId: string;
    request: ApplicationWebSocketRequest;
    socket: ApplicationBackendNetworkWebSocket;
  }): string {
    return this.webSocketSessionService.connect({
      ...input,
      requireApplication: () => this.requireApplicationWebSocketExposure(input.applicationId),
    });
  }

  dispose(): void {
    this.unsubscribeEngineNotifications?.();
    this.unsubscribeEngineNotifications = null;
    this.subscribedToEngineNotifications = false;
    this.dependencies.webSocketSessionService.dispose();
  }
}
