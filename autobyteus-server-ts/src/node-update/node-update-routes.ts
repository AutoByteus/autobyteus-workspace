import type { FastifyInstance } from "fastify";
import { normalizeClientAddress } from "../api/security/remote-access-local-trust.js";
import { starterClientFromEnvironment, type StarterClient } from "./starter-client.js";

/**
 * C1, frozen across versions (DESIGN.md rule 9 exception): this node's server package and in-place
 * update, for the desktop. A thin relay to the starter (C2), which alone knows the node's version.
 *
 * GET /rest/node-update?target=<version> →
 *   { inPlaceUpdate: "available", version, target?, update, message?, updateBlocker? } from the starter
 *     (`updateBlocker` { code, message }: why this node would refuse any update now);
 *   { inPlaceUpdate: "unavailable", version: null } when no starter runs this server
 *     (AUTOBYTEUS_STARTER_SOCKET absent: an embedded or development server);
 *   { inPlaceUpdate: "error", version: null, message } when the starter does not answer.
 * An invalid `target` is answered 400 with the starter's code (INVALID_VERSION).
 *
 * POST /rest/node-update { version } → the starter's answer to the request, which it logs with
 *   `requestedFrom` = the client address of this request:
 *   202 { accepted: true, version } or 409 { refused: code, message } (the starter's gates);
 *   409 { refused: "IN_PLACE_UPDATE_UNAVAILABLE", message } when no starter runs this server;
 *   502 { message } when the starter does not answer; 400 { message } without a version string.
 * Route class TRUSTED_NETWORK_OWNER (both methods): phones are refused.
 */
export async function registerNodeUpdateRoutes(
  app: FastifyInstance,
  starter: StarterClient | null = starterClientFromEnvironment(),
): Promise<void> {
  app.get<{ Querystring: { target?: string } }>("/node-update", async (request, reply) => {
    if (!starter) return { inPlaceUpdate: "unavailable", version: null };
    let answer;
    try {
      answer = await starter.getStatus(request.query.target);
    } catch (error) {
      return { inPlaceUpdate: "error", version: null, message: `The node's starter did not answer: ${(error as Error).message}` };
    }
    if (answer.statusCode !== 200) return reply.code(answer.statusCode).send(answer.body);
    const { version, target, update, message, updateBlocker } = answer.body;
    return {
      inPlaceUpdate: "available",
      version,
      ...(target === undefined ? {} : { target }),
      update,
      ...(message === undefined ? {} : { message }),
      ...(updateBlocker === undefined ? {} : { updateBlocker }),
    };
  });

  app.post<{ Body: { version?: unknown } }>("/node-update", async (request, reply) => {
    const version = request.body?.version;
    if (typeof version !== "string" || !version) {
      return reply.code(400).send({ message: "The body must be JSON { version }." });
    }
    if (!starter) {
      return reply.code(409).send({
        refused: "IN_PLACE_UPDATE_UNAVAILABLE",
        message: "This server does not run under a Docker node's starter, so it cannot update in place.",
      });
    }
    const requestedFrom = normalizeClientAddress(request.raw.socket.remoteAddress)?.normalized ?? "unknown address";
    let answer;
    try {
      answer = await starter.requestUpdate(version, requestedFrom);
    } catch (error) {
      return reply.code(502).send({ message: `The node's starter did not answer: ${(error as Error).message}` });
    }
    return reply.code(answer.statusCode).send(answer.body);
  });
}
