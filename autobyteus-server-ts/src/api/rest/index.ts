import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerFileRoutes } from "./files.js";
import { registerMediaRoutes } from "./media.js";
import { registerUploadRoutes } from "./upload-file.js";
import { registerWorkspaceRoutes } from "./workspaces.js";
import { registerContextFileRoutes } from "./context-files.js";
import { registerDefaultChannelIngressRoutes } from "./channel-ingress.js";
import { registerRunFileChangeRoutes } from "./run-file-changes.js";
import { registerTeamCommunicationRoutes } from "./team-communication.js";
import { registerTaskDelegationRoutes } from "./task-delegation.js";
import { registerApplicationBundleRoutes } from "./application-bundles.js";
import { registerApplicationBackendRoutes } from "./application-backends.js";
import { registerApplicationAvailabilityRoutes } from "./application-availability.js";
import { registerApplicationExecutionResourceRoutes } from "./application-execution-resources.js";
import { registerRemoteAccessRoutes } from "./remote-access.js";
import { registerMemorySyncRoutes } from "./memory-sync.js";
import type { ApplicationPlatformRuntime } from "../../application-platform/runtime/application-platform-runtime.js";

export async function registerRestRoutes(
  app: FastifyInstance,
  applicationRuntime: ApplicationPlatformRuntime,
): Promise<void> {
  await registerHealthRoutes(app);
  await registerRemoteAccessRoutes(app);
  await registerMemorySyncRoutes(app);
  await registerFileRoutes(app);
  await registerMediaRoutes(app);
  await registerUploadRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerContextFileRoutes(app);
  await registerRunFileChangeRoutes(app);
  await registerTeamCommunicationRoutes(app);
  await registerTaskDelegationRoutes(app);
  await registerDefaultChannelIngressRoutes(app);
  await registerApplicationBundleRoutes(app, applicationRuntime.bundleService);
  await registerApplicationBackendRoutes(app, {
    gateway: applicationRuntime.backendGateway,
    lifecycle: applicationRuntime.lifecycle,
  });
  await registerApplicationAvailabilityRoutes(app, {
    gateway: applicationRuntime.backendGateway,
    availabilityService: applicationRuntime.availabilityService,
    lifecycle: applicationRuntime.lifecycle,
  });
  await registerApplicationExecutionResourceRoutes(
    app,
    applicationRuntime.orchestrationHostService,
  );
}
