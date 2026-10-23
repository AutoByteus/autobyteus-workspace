import type { FastifyInstance } from "fastify";
import { findProcessRemoteCollaboration } from "../../remote-collaboration/remote-collaboration-services.js";
import type { PeerGatewayResponse } from "../../remote-collaboration/channel/peer-gateway.js";

/**
 * The inter-node routes (`/rest/remote/*`, route class `REMOTE_PEER`): an HTTP binding of the peer gateway
 * only. Admission and every rule live behind the gateway; a server without remote collaboration answers 404.
 */
export async function registerRemoteCollaborationRoutes(app: FastifyInstance): Promise<void> {
  const send = (reply: { code(status: number): { send(payload: unknown): unknown } }, response: PeerGatewayResponse<unknown>) =>
    reply.code(response.status).send(response.answer);

  app.post("/remote/delegated-runs", async (request, reply) => {
    const remote = findProcessRemoteCollaboration();
    if (!remote) return reply.code(404).send({ message: "Remote collaboration is not available on this server." });
    return send(reply, await remote.gateway.startDelegatedRun(request.body));
  });

  app.post("/remote/messages", async (request, reply) => {
    const remote = findProcessRemoteCollaboration();
    if (!remote) return reply.code(404).send({ message: "Remote collaboration is not available on this server." });
    return send(reply, await remote.gateway.deliverMessage(request.body));
  });

  app.post("/remote/availability", async (request, reply) => {
    const remote = findProcessRemoteCollaboration();
    if (!remote) return reply.code(404).send({ message: "Remote collaboration is not available on this server." });
    return send(reply, await remote.gateway.checkAvailability(request.body));
  });

  app.post("/remote/available-agents", async (request, reply) => {
    const remote = findProcessRemoteCollaboration();
    if (!remote) return reply.code(404).send({ message: "Remote collaboration is not available on this server." });
    return send(reply, await remote.gateway.listAvailableAgents(request.body));
  });
}
