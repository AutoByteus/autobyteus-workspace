import type { FastifyInstance } from "fastify";
import { ExternalChannelParseError } from "autobyteus-ts/external-channel/errors.js";
import { parseExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { OutboundOutboxService } from "../../application/services/outbound-outbox-service.js";
import { verifyServerCallbackSignature } from "../middleware/verify-server-callback-signature.js";

export type ServerCallbackDeps = {
  outboundOutboxService: Pick<OutboundOutboxService, "enqueueOrGet">;
  serverCallbackSharedSecret?: string | null;
  allowInsecureServerCallbacks?: boolean;
};

export function registerServerCallbackRoutes(app: FastifyInstance, deps: ServerCallbackDeps): void {
  app.post("/api/server-callback/v1/messages", async (request, reply) => {
    try {
      const rawBody =
        (request as { rawBody?: string }).rawBody ??
        JSON.stringify(request.body ?? {});
      const authResult = verifyServerCallbackSignature({
        rawBody,
        signatureHeader: normalizeHeader(
          request.headers["x-autobyteus-server-signature"],
        ),
        timestampHeader: normalizeHeader(
          request.headers["x-autobyteus-server-timestamp"],
        ),
        secret: deps.serverCallbackSharedSecret ?? null,
        allowInsecureWhenSecretMissing: deps.allowInsecureServerCallbacks === true,
      });
      if (!authResult.valid) {
        return reply.code(401).send({
          code: authResult.errorCode ?? "INVALID_SERVER_CALLBACK_SIGNATURE",
          detail: authResult.message,
        });
      }

      const payload = parseExternalOutboundEnvelope(request.body);
      const enqueueResult = await deps.outboundOutboxService.enqueueOrGet(
        payload.callbackIdempotencyKey,
        payload,
      );
      return reply.code(202).send({
        accepted: true,
        duplicate: enqueueResult.duplicate,
        queued: !enqueueResult.duplicate,
      });
    } catch (error) {
      if (error instanceof ExternalChannelParseError) {
        return reply.code(400).send({
          code: error.code,
          field: error.field ?? null,
          detail: error.message,
        });
      }
      return reply.code(500).send({
        code: "SERVER_CALLBACK_INTERNAL_ERROR",
        detail: "Unexpected server callback error.",
      });
    }
  });
}

const normalizeHeader = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    const normalized = value[0].trim();
    return normalized.length > 0 ? normalized : null;
  }
  return null;
};
