import type { RemoteCollaborationServices } from "../../remote-collaboration/remote-collaboration-services.js";
import type { FastifyInstance } from "fastify";
import type { ProviderRelayPeerHandler } from "../../credential-proxy/provider-relay-peer/provider-relay-peer-handler.js";
import { registerHealthRoutes } from "./health.js";
import { registerFileRoutes } from "./files.js";
import { registerMediaRoutes } from "./media.js";
import { registerUploadRoutes } from "./upload-file.js";
import { registerWorkspaceRoutes } from "./workspaces.js";
import { registerNodeFileRoutes } from "./node-files.js";
import { registerContextFileRoutes } from "./context-files.js";
import { registerRunFileChangeRoutes } from "./run-file-changes.js";
import { registerCollaborationMessageReferenceRoutes } from "./collaboration-message-references.js";
import { registerApplicationBundleRoutes } from "./application-bundles.js";
import { registerApplicationBackendRoutes } from "./application-backends.js";
import { registerApplicationAvailabilityRoutes } from "./application-availability.js";
import { registerApplicationExecutionResourceRoutes } from "./application-execution-resources.js";
import { registerRemoteAccessRoutes } from "./remote-access.js";
import { registerMemorySyncRoutes } from "./memory-sync.js";
import { registerRemoteCollaborationRoutes } from "./remote.js";
import { registerPrivateNetworkRoutes } from "./private-network.js";
import type { PrivateNetwork } from "../../compositions/private-network-composition.js";
import { registerNodeUpdateRoutes } from "../../node-update/node-update-routes.js";
import { registerNodeDesktopRoutes } from "./node-desktop.js";
import { registerNodeAccessRoutes } from "./node-access.js";
import { registerMcpGatewayTokenRoutes } from "./mcp-gateway-token.js";
import { registerExtensionRoutes } from "./extensions.js";
import type { ExtensionManager } from "../../extensions/services/extension-manager.js";
import type { NodeAccess } from "../../compositions/node-access-composition.js";
import type { ApplicationPlatformLifecycleReadiness, ApplicationPlatformRestContracts } from "../../application-platform/runtime/application-platform-runtime-contracts.js";

import { registerProjectTaskContextRoutes } from "./project-task-context-files.js";

export async function registerRestRoutes(
  app: FastifyInstance,
  dependencies: {
    lifecycleReadiness: ApplicationPlatformLifecycleReadiness;
    application: ApplicationPlatformRestContracts;
    nodeAccess: Pick<NodeAccess, "setupCodes" | "ownerCredentials" | "mcpGatewayTokens">;
    /** The studio's remote collaboration, behind `/rest/remote/*` (autobyteus-500 FU-011). */
    remoteCollaboration: RemoteCollaborationServices;
    /** autobyteus-661: the private network's routes (`/rest/remote/info`); a host without one has none. */
    privateNetwork?: Pick<PrivateNetwork, "info">;
    /** autobyteus-581: this node as a relay node, behind `/rest/remote/provider-relays/*`. */
    providerRelayPeerHandler: ProviderRelayPeerHandler;
    /** The node's extensions, behind `/rest/extensions/*` (autobyteus-516). */
    extensions: ExtensionManager;
  },
): Promise<void> {
  await registerHealthRoutes(app);
  await registerRemoteAccessRoutes(app);
  await registerNodeAccessRoutes(app, dependencies.nodeAccess);
  await registerMcpGatewayTokenRoutes(app, dependencies.nodeAccess.mcpGatewayTokens);
  await registerNodeUpdateRoutes(app);
  await registerNodeDesktopRoutes(app);
  await registerMemorySyncRoutes(app);
  await registerRemoteCollaborationRoutes(app, dependencies.remoteCollaboration, dependencies.providerRelayPeerHandler);
  if (dependencies.privateNetwork) await registerPrivateNetworkRoutes(app, { info: dependencies.privateNetwork.info });
  await registerExtensionRoutes(app, { extensions: dependencies.extensions });
  await registerFileRoutes(app);
  await registerMediaRoutes(app);
  await registerUploadRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerNodeFileRoutes(app);
  await registerContextFileRoutes(app);
  await registerProjectTaskContextRoutes(app);
  await registerRunFileChangeRoutes(app);
  await registerCollaborationMessageReferenceRoutes(app);
  await registerApplicationBundleRoutes(app, dependencies.application.assets);
  await registerApplicationBackendRoutes(app, {
    gateway: dependencies.application.backend,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationAvailabilityRoutes(app, {
    gateway: dependencies.application.backend,
    availabilityService: dependencies.application.availability,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationExecutionResourceRoutes(
    app,
    dependencies.application.executionResources,
  );
}
