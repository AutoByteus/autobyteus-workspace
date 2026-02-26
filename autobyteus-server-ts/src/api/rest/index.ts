import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerFileRoutes } from "./files.js";
import { registerMediaRoutes } from "./media.js";
import { registerUploadRoutes } from "./upload-file.js";
import { registerWorkspaceRoutes } from "./workspaces.js";
import { registerChannelIngressRoutes } from "./channel-ingress.js";
import { getDefaultChannelIngressRouteDependencies } from "../../external-channel/runtime/default-channel-ingress-route-dependencies.js";

export async function registerRestRoutes(app: FastifyInstance): Promise<void> {
  await registerHealthRoutes(app);
  await registerFileRoutes(app);
  await registerMediaRoutes(app);
  await registerUploadRoutes(app);
  await registerWorkspaceRoutes(app);
  await registerChannelIngressRoutes(app, getDefaultChannelIngressRouteDependencies());
}
