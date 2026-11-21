import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ClientIdentity } from "../../node-access/domain/client-identity.js";
import { getClientIdentity, registerOpenSocket } from "../security/node-access-gate.js";
import type { RemoteCollaborationServices } from "../../remote-collaboration/remote-collaboration-services.js";
import type { PeerGatewayResponse } from "../../remote-collaboration/channel/peer-gateway.js";
import type { RunAgentObservation } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import { TRANSFERRED_FILE_PIECE_MAX_BYTES } from "../../agent-collaboration/execution/remote/transferred-files.js";


type PeerSocket = Readonly<{
  send(payload: string): void;
  close(code?: number, reason?: string): void;
  once(event: "message", listener: (data: Buffer) => void): void;
  on(event: "close" | "error", listener: (...args: unknown[]) => void): void;
}>;

/**
 * The inter-node routes (`/rest/remote/*`): an HTTP binding of the peer gateway and of the pairing exchange only. The
 * node access gate admitted a paired peer by its signature (the exchange is exempt); every other rule lives behind
 * the gateway. Registered by the studio with its remote collaboration (autobyteus-500 FU-011); a host without one has
 * no such routes.
 */
export async function registerRemoteCollaborationRoutes(app: FastifyInstance, remote: RemoteCollaborationServices): Promise<void> {
  const send = (reply: { code(status: number): { send(payload: unknown): unknown } }, response: PeerGatewayResponse<unknown>) =>
    reply.code(response.status).send(response.answer);
  type Gateway = RemoteCollaborationServices["gateway"];
  const post = (path: string, handle: (gateway: Gateway, body: unknown, caller: ClientIdentity | null) => Promise<PeerGatewayResponse<unknown>>) =>
    app.post(path, async (request: FastifyRequest, reply) => send(reply, await handle(remote.gateway, request.body, getClientIdentity(request))));

  post("/remote/delegated-runs", (gateway, body, caller) => gateway.startDelegatedRun(body, caller));
  post("/remote/messages", (gateway, body, caller) => gateway.deliverMessage(body, caller));
  post("/remote/availability", (gateway, body, caller) => gateway.checkAvailability(body, caller));
  post("/remote/available-agents", (gateway, body, caller) => gateway.listAvailableAgents(body, caller));
  // autobyteus-492: a message to a running agent by its run ID only, and the running runs a person started.
  post("/remote/run-messages", (gateway, body, caller) => gateway.deliverRunMessage(body, caller));
  post("/remote/running-agents", (gateway, body, caller) => gateway.listRunningAgents(body, caller));
  // autobyteus-278: what a peer's owner reads and drives on this node, for runs its delegation started.
  post("/remote/run-summaries", (gateway, body, caller) => gateway.runSummaries(body, caller));
  post("/remote/agent-projection", (gateway, body, caller) => gateway.agentProjection(body, caller));
  post("/remote/owner-commands", (gateway, body, caller) => gateway.ownerCommand(body, caller));
  // autobyteus-461 SR-088: one agent's own stream snapshot (its frames come on `run-observations`, opened for the agent).
  post("/remote/agent-stream-snapshot", (gateway, body, caller) => gateway.agentStreamSnapshot(body, caller));
  // autobyteus-587: files sent with a message or delegation, uploaded before it (RFC-001 § 6).
  post("/remote/received-files/status", (gateway, body, caller) => gateway.receivedFilesStatus(body, caller));
  // A piece is raw bytes; its parser and body limit live in this scope only (other routes keep refusing an octet-stream
  // body). The gate hashes the body as it arrives and checks it against the signature before the handler runs (NA-9).
  await app.register(async (pieceScope) => {
    pieceScope.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
    pieceScope.put<{ Params: { sha256: string }; Querystring: Record<string, string | undefined>; Body: Buffer | undefined }>(
      "/remote/received-files/:sha256",
      { bodyLimit: TRANSFERRED_FILE_PIECE_MAX_BYTES },
      async (request, reply) => send(reply, await remote.gateway.receivedFilePiece({
        fromNodeId: request.query.fromNodeId, toNodeId: request.query.toNodeId, sha256: request.params.sha256,
        offset: request.query.offset, size: request.query.size, bytes: request.body ?? Buffer.alloc(0),
      }, getClientIdentity(request))),
    );
  });

  // autobyteus-437: the inviting node's side of peer pairing (exempt: the caller has no peer secret yet).
  app.post("/remote/peer-pairing-exchanges", async (request, reply) => {
    const answer = await remote.pairing.exchange(request.body);
    if ("peerSecret" in answer) return reply.code(201).send(answer);
    return reply.code(answer.statusCode).send({ code: answer.code, message: answer.message });
  });

  /**
   * autobyteus-278: a run's live output for the peer that started it. The peer's first frame is the envelope with
   * `targetRoot`; this node answers `{nodeId}` and then `{agentRunId, message}` frames, or a refusal and closes.
   * There is no reconnect: either side closing ends it.
   */
  app.get("/remote/run-observations", { websocket: true }, (connection: unknown, request: FastifyRequest) => {
    const socket = ((connection as { socket?: unknown }).socket ?? connection) as PeerSocket;
    let observation: RunAgentObservation | null = null;
    let closed = false;
    // Registered under the peer's identity, so removing the peer closes it (NA-11).
    const unregister = registerOpenSocket(request, socket);
    socket.on("close", () => {
      closed = true;
      unregister();
      observation?.close();
      observation = null;
    });
    socket.on("error", () => undefined);
    socket.once("message", (data) => {
      let body: unknown;
      try { body = JSON.parse(data.toString()); } catch { body = null; }
      // The opening `{nodeId}` is always the first frame (N-401): a run that is live when observed can produce a frame
      // while it is being subscribed, before the gateway answers; such frames wait here and follow the opening in order.
      let held: unknown[] | null = [];
      const sink = Object.freeze({
        send: (frame: unknown) => {
          if (closed) return;
          if (held) held.push(frame);
          else socket.send(JSON.stringify(frame));
        },
        close: () => { if (!closed) socket.close(1000); },
      });
      void remote.gateway.openRunObservation(body, getClientIdentity(request), sink).then((response) => {
        const answer = response.answer;
        if (!answer.accepted || !("observation" in answer)) {
          socket.send(JSON.stringify(answer));
          socket.close(1000);
          return;
        }
        if (closed) { answer.observation.close(); return; }
        observation = answer.observation;
        socket.send(JSON.stringify({ nodeId: answer.nodeId }));
        const waiting = held ?? [];
        held = null;
        waiting.forEach((frame) => socket.send(JSON.stringify(frame)));
      }, () => socket.close(1011));
    });
  });
}
