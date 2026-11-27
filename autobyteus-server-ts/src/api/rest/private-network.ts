import type { FastifyInstance } from "fastify";
import type { NodeInfoResponder } from "../../private-network/node-info-responder.js";
import { getPrivateNetworkCaller } from "../security/node-access-gate.js";

/**
 * The private network's routes (autobyteus-661). `POST /rest/remote/info` is exempt (a node that is not a peer asks
 * it): a visible node answers `{nodeId, name}`; a node that is not visible answers exactly as a server without the
 * route, so it cannot be told apart from a machine without AutoByteus (contract §2).
 */
export async function registerPrivateNetworkRoutes(app: FastifyInstance, dependencies: Readonly<{ info: NodeInfoResponder }>): Promise<void> {
  app.post("/remote/info", async (request, reply) => {
    const answer = await dependencies.info.answer(getPrivateNetworkCaller(request));
    if (answer) return answer;
    return reply.code(404).send({ message: `Route POST:${request.url} not found`, error: "Not Found", statusCode: 404 });
  });
}
