import type { FastifyInstance } from "fastify";
import {
  createUnconfiguredDependencies,
  type ChannelIngressRouteDependencies,
} from "./channel-ingress-route-shared.js";
import { registerChannelIngressMessageRoute } from "./channel-ingress-message-route.js";
import { registerChannelDeliveryEventRoute } from "./channel-delivery-event-route.js";

export type { ChannelIngressRouteDependencies } from "./channel-ingress-route-shared.js";
export { ChannelIngressNotConfiguredError } from "./channel-ingress-route-shared.js";

export async function registerChannelIngressRoutes(
  app: FastifyInstance,
  deps: ChannelIngressRouteDependencies = createUnconfiguredDependencies(),
): Promise<void> {
  await registerChannelIngressMessageRoute(app, deps);
  await registerChannelDeliveryEventRoute(app, deps);
}
