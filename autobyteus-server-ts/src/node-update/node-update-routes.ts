import type { FastifyInstance } from "fastify";
import { starterClientFromEnvironment, type StarterClient } from "./starter-client.js";

/**
 * C1, frozen across versions (DESIGN.md rule 9 exception): this node's server package and in-place
 * update, for the desktop. A thin relay to the starter (C2), which alone knows the node's version.
 *
 * GET /rest/node-update?target=<version> →
 *   { inPlaceUpdate: "available", version, target?, update, message? } from the starter;
 *   { inPlaceUpdate: "unavailable", version: null } when no starter runs this server
 *     (AUTOBYTEUS_STARTER_SOCKET absent: an embedded or development server);
 *   { inPlaceUpdate: "error", version: null, message } when the starter does not answer.
 * An invalid `target` is answered 400 with the starter's code (INVALID_VERSION).
 * Route class TRUSTED_NETWORK_OWNER: phones are refused.
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
    const { version, target, update, message } = answer.body;
    return {
      inPlaceUpdate: "available",
      version,
      ...(target === undefined ? {} : { target }),
      update,
      ...(message === undefined ? {} : { message }),
    };
  });
}
