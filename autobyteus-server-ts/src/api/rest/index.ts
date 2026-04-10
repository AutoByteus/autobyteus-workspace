import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerFileRoutes } from "./files.js";
import { registerMediaRoutes } from "./media.js";
import { registerUploadRoutes } from "./upload-file.js";
import { registerWorkspaceRoutes } from "./workspaces.js";
import { registerDefaultChannelIngressRoutes } from "./channel-ingress.js";
import { registerRunFileChangeRoutes } from "./run-file-changes.js";

export async function registerRestRoutes(app: FastifyInstance): Promise<void> {
  await registerHealthRoutes(app);
  await registerFileRoutes(app);
  await registerMediaRoutes(app);
  await registerUploadRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerRunFileChangeRoutes(app);
  await registerDefaultChannelIngressRoutes(app);
}
