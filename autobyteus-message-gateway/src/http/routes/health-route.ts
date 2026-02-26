import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({
    service: "autobyteus-message-gateway",
    status: "ok",
    timestamp: new Date().toISOString(),
  }));
}
