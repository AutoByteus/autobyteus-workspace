import type { FastifyInstance } from "fastify";
import { findProcessRemoteCollaboration } from "../../remote-collaboration/remote-collaboration-services.js";
import type { PeerGatewayResponse } from "../../remote-collaboration/channel/peer-gateway.js";
import type { PairedAgentObservation } from "../../agent-collaboration/execution/remote/paired-agent-access.js";

const UNAVAILABLE = { message: "Remote collaboration is not available on this server." };

type PeerSocket = Readonly<{
  send(payload: string): void;
  close(code?: number): void;
  once(event: "message", listener: (data: Buffer) => void): void;
  on(event: "close" | "error", listener: (...args: unknown[]) => void): void;
}>;

/**
 * The inter-node routes (`/rest/remote/*`, route class `REMOTE_PEER`): an HTTP binding of the peer gateway
 * only. Admission and every rule live behind the gateway; a server without remote collaboration answers 404.
 */
export async function registerRemoteCollaborationRoutes(app: FastifyInstance): Promise<void> {
  const send = (reply: { code(status: number): { send(payload: unknown): unknown } }, response: PeerGatewayResponse<unknown>) =>
    reply.code(response.status).send(response.answer);
  const post = (path: string, handle: (gateway: NonNullable<ReturnType<typeof findProcessRemoteCollaboration>>["gateway"], body: unknown) => Promise<PeerGatewayResponse<unknown>>) =>
    app.post(path, async (request, reply) => {
      const remote = findProcessRemoteCollaboration();
      if (!remote) return reply.code(404).send(UNAVAILABLE);
      return send(reply, await handle(remote.gateway, request.body));
    });

  post("/remote/delegated-runs", (gateway, body) => gateway.startDelegatedRun(body));
  post("/remote/messages", (gateway, body) => gateway.deliverMessage(body));
  post("/remote/availability", (gateway, body) => gateway.checkAvailability(body));
  post("/remote/available-agents", (gateway, body) => gateway.listAvailableAgents(body));
  // autobyteus-278: what a peer's owner reads and drives on this node, for runs its delegation started.
  post("/remote/run-summaries", (gateway, body) => gateway.runSummaries(body));
  post("/remote/agent-projection", (gateway, body) => gateway.agentProjection(body));
  post("/remote/owner-commands", (gateway, body) => gateway.ownerCommand(body));

  /**
   * autobyteus-278: a run's live output for the peer that started it. The peer's first frame is the envelope with
   * `targetRoot`; this node answers `{nodeId}` and then `{agentRunId, message}` frames, or a refusal and closes.
   * There is no reconnect: either side closing ends it.
   */
  app.get("/remote/run-observations", { websocket: true }, (connection: unknown) => {
    const socket = ((connection as { socket?: unknown }).socket ?? connection) as PeerSocket;
    let observation: PairedAgentObservation | null = null;
    let closed = false;
    socket.on("close", () => {
      closed = true;
      observation?.close();
      observation = null;
    });
    socket.on("error", () => undefined);
    socket.once("message", (data) => {
      const remote = findProcessRemoteCollaboration();
      if (!remote) {
        socket.send(JSON.stringify({ accepted: false, code: "REMOTE_COLLABORATION_OFF", message: UNAVAILABLE.message }));
        socket.close(1000);
        return;
      }
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
      void remote.gateway.openRunObservation(body, sink).then((response) => {
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
