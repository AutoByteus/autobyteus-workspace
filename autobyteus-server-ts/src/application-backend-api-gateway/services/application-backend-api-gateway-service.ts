import type {
  ApplicationEngineStatus,
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteRequest,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { ApplicationAvailabilityService, getApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import {
  ApplicationEngineHostService,
  getApplicationEngineHostService,
} from "../../application-engine/services/application-engine-host-service.js";
import {
  ApplicationBackendNotificationStreamService,
  getApplicationBackendNotificationStreamService,
} from "../streaming/application-backend-notification-stream-service.js";

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
  private static instance: ApplicationBackendApiGatewayService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationBackendApiGatewayService>[0] = {},
  ): ApplicationBackendApiGatewayService {
    if (!ApplicationBackendApiGatewayService.instance) {
      ApplicationBackendApiGatewayService.instance = new ApplicationBackendApiGatewayService(dependencies);
    }
    return ApplicationBackendApiGatewayService.instance;
  }

  static resetInstance(): void {
    ApplicationBackendApiGatewayService.instance = null;
  }

  private subscribedToEngineNotifications = false;

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      availabilityService?: ApplicationAvailabilityService;
      engineHostService?: ApplicationEngineHostService;
      notificationStreamService?: ApplicationBackendNotificationStreamService;
    } = {},
  ) {
    this.ensureNotificationBridge();
  }

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService ?? getApplicationAvailabilityService();
  }

  private get engineHostService(): ApplicationEngineHostService {
    return this.dependencies.engineHostService ?? getApplicationEngineHostService();
  }

  private get notificationStreamService(): ApplicationBackendNotificationStreamService {
    return this.dependencies.notificationStreamService ?? getApplicationBackendNotificationStreamService();
  }

  private ensureNotificationBridge(): void {
    if (this.subscribedToEngineNotifications) {
      return;
    }
    if (typeof (this.engineHostService as { onNotification?: unknown }).onNotification !== "function") {
      return;
    }
    this.subscribedToEngineNotifications = true;
    this.engineHostService.onNotification(({ applicationId, message }) => {
      this.notificationStreamService.publish({
        applicationId,
        topic: message.topic,
        payload: message.payload,
        publishedAt: message.publishedAt,
      });
    });
  }

  private async requireApplication(applicationId: string): Promise<void> {
    await this.availabilityService.requireApplicationActive(applicationId);
    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (!application) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }
  }

  async getApplicationEngineStatus(applicationId: string): Promise<ApplicationEngineStatus> {
    await this.requireApplication(applicationId);
    return this.engineHostService.getApplicationEngineStatus(applicationId);
  }

  async ensureApplicationReady(applicationId: string): Promise<ApplicationEngineStatus> {
    await this.requireApplication(applicationId);
    return this.engineHostService.ensureApplicationEngine(applicationId);
  }

  async invokeApplicationQuery(
    applicationId: string,
    queryName: string,
    requestContext: ApplicationRequestContext | null,
    input: unknown,
  ): Promise<unknown> {
    await this.requireApplication(applicationId);
    return this.engineHostService.invokeApplicationQuery(applicationId, {
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
    return this.engineHostService.invokeApplicationCommand(applicationId, {
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
    return this.engineHostService.routeApplicationRequest(applicationId, {
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
    return this.engineHostService.executeApplicationGraphql(applicationId, {
      requestContext: normalizeRequestContext(applicationId, requestContext),
      request,
    });
  }
}

let cachedApplicationBackendApiGatewayService: ApplicationBackendApiGatewayService | null = null;

export const getApplicationBackendApiGatewayService = (): ApplicationBackendApiGatewayService => {
  if (!cachedApplicationBackendApiGatewayService) {
    cachedApplicationBackendApiGatewayService = ApplicationBackendApiGatewayService.getInstance();
  }
  return cachedApplicationBackendApiGatewayService;
};
