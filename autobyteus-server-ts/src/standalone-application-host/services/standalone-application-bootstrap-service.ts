import type { StandaloneApplicationBootstrapPayload } from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendRestContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import type { StandaloneApplicationSelection } from "../domain/standalone-application-selection.js";

export class StandaloneApplicationBootstrapService {
  constructor(private readonly dependencies: {
    selection: StandaloneApplicationSelection;
    lifecycle: ApplicationPlatformLifecycleReadiness;
    gateway: ApplicationBackendRestContract;
  }) {}

  async getBootstrap(): Promise<StandaloneApplicationBootstrapPayload> {
    await this.dependencies.lifecycle.awaitReady();
    await this.dependencies.gateway.ensureApplicationReady(
      this.dependencies.selection.applicationId,
    );
    const application = this.dependencies.selection.bundle;
    return {
      contractVersion: "1",
      application: {
        applicationId: application.id,
        localApplicationId: application.localApplicationId,
        packageId: application.packageId,
        name: application.name,
      },
      transportPaths: {
        backendBasePath: "/_autobyteus/backend",
        backendNotificationsPath: application.backend.supportedExposures.notifications
          ? "/_autobyteus/backend/notifications"
          : null,
        backendWebSocketBasePath: application.backend.supportedExposures.webSockets
          ? "/_autobyteus/backend/ws"
          : null,
        agentCommunicationWebSocketBasePath: "/_autobyteus/agent",
      },
    };
  }
}
