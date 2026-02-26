import type { FastifyInstance } from "fastify";
import {
  ExternalDeliveryStatus,
  parseExternalDeliveryEvent,
} from "autobyteus-ts/external-channel/external-delivery-event.js";
import {
  type ChannelIngressRouteDependencies,
  handleRouteError,
  resolveCallbackIdempotencyKey,
  resolveErrorMessage,
  verifyGatewayRequestSignature,
} from "./channel-ingress-route-shared.js";

export async function registerChannelDeliveryEventRoute(
  app: FastifyInstance,
  deps: ChannelIngressRouteDependencies,
): Promise<void> {
  app.post("/api/channel-ingress/v1/delivery-events", async (request, reply) => {
    const signatureError = verifyGatewayRequestSignature(request.body, request.headers, deps);
    if (signatureError) {
      return reply.code(401).send(signatureError);
    }

    try {
      const event = parseExternalDeliveryEvent(request.body);
      const callbackIdempotencyKey = resolveCallbackIdempotencyKey(
        event.metadata,
        event.correlationMessageId,
      );

      const baseInput = {
        provider: event.provider,
        transport: event.transport,
        accountId: event.accountId,
        peerId: event.peerId,
        threadId: event.threadId,
        correlationMessageId: event.correlationMessageId,
        callbackIdempotencyKey,
        metadata: event.metadata,
      };

      if (event.status === ExternalDeliveryStatus.PENDING) {
        await deps.deliveryEventService.recordPending(baseInput);
      } else if (
        event.status === ExternalDeliveryStatus.SENT ||
        event.status === ExternalDeliveryStatus.DELIVERED
      ) {
        await deps.deliveryEventService.recordSent(baseInput);
      } else {
        await deps.deliveryEventService.recordFailed({
          ...baseInput,
          errorMessage: resolveErrorMessage(event.metadata),
        });
      }

      return reply.code(202).send({
        accepted: true,
        status: event.status,
        callbackIdempotencyKey,
      });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
}
