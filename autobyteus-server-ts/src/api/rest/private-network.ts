import type { FastifyInstance } from "fastify";
import { ExtensionError } from "../../extensions/domain/extension-error.js";
import type { NodeInfoResponder } from "../../private-network/node-info-responder.js";
import { PrivateNetworkUnavailableError, type PrivateNetworkRole } from "../../private-network/private-network-role.js";
import { getPrivateNetworkCaller } from "../security/node-access-gate.js";

/**
 * The private network's routes (autobyteus-661).
 *
 * - `POST /rest/remote/info` is exempt (a node that is not a peer asks it): a visible node answers `{nodeId, name}`; a
 *   node that is not visible answers exactly as a server without the route, so it cannot be told apart from a machine
 *   without AutoByteus (contract §2).
 * - `GET /rest/private-network/relay` is the owner's (route table): the network relay's port and credential, which the
 *   desktop's proxy uses to reach private addresses through this node (design DS-7). Without Private Network: 409
 *   `PRIVATE_NETWORK_NOT_SET_UP`; an extension that cannot answer: 502 with its reason.
 */
export async function registerPrivateNetworkRoutes(
  app: FastifyInstance,
  dependencies: Readonly<{ info: NodeInfoResponder; role: Pick<PrivateNetworkRole, "relay"> }>,
): Promise<void> {
  app.post("/remote/info", async (request, reply) => {
    const answer = await dependencies.info.answer(getPrivateNetworkCaller(request));
    if (answer) return answer;
    return reply.code(404).send({ message: `Route POST:${request.url} not found`, error: "Not Found", statusCode: 404 });
  });

  app.get("/private-network/relay", async (_request, reply) => {
    try {
      const relay = await dependencies.role.relay();
      reply.header("cache-control", "no-store");
      return { port: relay.port, credential: relay.credential };
    } catch (error) {
      if (error instanceof PrivateNetworkUnavailableError) {
        return reply.code(error.code === "PRIVATE_NETWORK_NOT_SET_UP" ? 409 : 502).send({ code: error.code, message: error.message });
      }
      if (error instanceof ExtensionError) return reply.code(502).send({ code: error.code, message: error.message });
      throw error;
    }
  });
}
