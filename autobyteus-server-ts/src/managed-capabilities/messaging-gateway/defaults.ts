import { MessagingGatewayAdminClient } from "./messaging-gateway-admin-client.js";
import { MessagingGatewayInstallerService } from "./messaging-gateway-installer-service.js";
import { MessagingGatewayProcessSupervisor } from "./messaging-gateway-process-supervisor.js";
import { MessagingGatewayReleaseManifestService } from "./messaging-gateway-release-manifest-service.js";
import { ManagedMessagingGatewayService } from "./managed-messaging-gateway-service.js";

let cachedManagedMessagingGatewayService: ManagedMessagingGatewayService | null =
  null;

export const getManagedMessagingGatewayService =
  (): ManagedMessagingGatewayService => {
    if (!cachedManagedMessagingGatewayService) {
      cachedManagedMessagingGatewayService = new ManagedMessagingGatewayService({
        manifestService: new MessagingGatewayReleaseManifestService({
          manifestUrl: process.env.MANAGED_MESSAGING_GATEWAY_MANIFEST_URL ?? null,
          manifestPath:
            process.env.MANAGED_MESSAGING_GATEWAY_MANIFEST_PATH ?? null,
        }),
        installerService: new MessagingGatewayInstallerService(),
        processSupervisor: new MessagingGatewayProcessSupervisor(),
        adminClient: new MessagingGatewayAdminClient(),
      });
    }
    return cachedManagedMessagingGatewayService;
  };

export const __resetManagedMessagingGatewayServiceForTests = async (): Promise<void> => {
  if (cachedManagedMessagingGatewayService) {
    await cachedManagedMessagingGatewayService.close();
  }
  cachedManagedMessagingGatewayService = null;
};

