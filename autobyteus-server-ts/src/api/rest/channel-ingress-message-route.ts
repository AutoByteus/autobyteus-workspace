import type { FastifyInstance } from "fastify";
import { parseExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  type ChannelIngressRouteDependencies,
  handleRouteError,
  verifyGatewayRequestSignature,
} from "./channel-ingress-route-shared.js";

export async function registerChannelIngressMessageRoute(
  app: FastifyInstance,
  deps: ChannelIngressRouteDependencies,
): Promise<void> {
  app.post("/api/channel-ingress/v1/messages", async (request, reply) => {
    const signatureError = verifyGatewayRequestSignature(request.body, request.headers, deps);
    if (signatureError) {
      return reply.code(401).send(signatureError);
    }

    try {
      const envelope = parseExternalMessageEnvelope(request.body);
      const result = await deps.ingressService.handleInboundMessage(envelope);
      return reply.code(202).send({
        accepted: true,
        duplicate: result.duplicate,
        disposition: result.disposition,
        bindingResolved: result.bindingResolved,
        idempotencyKey: result.idempotencyKey,
        bindingId: result.binding?.id ?? null,
      });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
}
