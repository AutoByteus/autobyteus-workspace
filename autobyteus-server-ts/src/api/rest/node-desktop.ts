import type { FastifyInstance } from "fastify";
import { resolveNodeDesktop } from "../../node-desktop/node-desktop-availability.js";

/**
 * GET /rest/node-desktop → 200 { available }: whether this node has a node desktop to view
 * (a Docker node). Route class TRUSTED_NETWORK_PROTECTED, as other protected REST routes.
 */
export async function registerNodeDesktopRoutes(app: FastifyInstance): Promise<void> {
  app.get("/node-desktop", async () => ({ available: resolveNodeDesktop(process.env) !== null }));
}
