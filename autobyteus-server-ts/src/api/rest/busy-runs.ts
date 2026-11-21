import type { FastifyInstance } from "fastify";
import type { BusyRunCount } from "../../application-platform/runtime/application-platform-runtime-contracts.js";

/** The enclosing REST plugin applies the usual node access gate. */
export function registerBusyRunRoutes(app: FastifyInstance, observe: () => Promise<BusyRunCount>): void {
  app.get("/busy-runs", async () => observe());
}
