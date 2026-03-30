import type { FastifyInstance } from "fastify";
import {
  createUnconfiguredDependencies,
  type ChannelIngressRouteDependencies,
} from "./channel-ingress-route-shared.js";
import { ChannelIngressService } from "../../external-channel/services/channel-ingress-service.js";
import { DeliveryEventService } from "../../external-channel/services/delivery-event-service.js";
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

export async function registerDefaultChannelIngressRoutes(
  app: FastifyInstance,
): Promise<void> {
  await registerChannelIngressRoutes(app, {
    ingressService: new ChannelIngressService(),
    deliveryEventService: new DeliveryEventService(),
    gatewaySecret: process.env.CHANNEL_GATEWAY_SHARED_SECRET ?? null,
  });
}
