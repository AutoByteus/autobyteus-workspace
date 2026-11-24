import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { PeerRunStreamSession } from "../../services/agent-streaming/peer-run-stream-session.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

type PeerRunParams = { nodeId: string; runKind: string; runId: string; agentRunId: string };

/**
 * `/ws/peer-run/:nodeId/:runKind/:runId/:agentRunId` (autobyteus-461 G-D1, SR-088): a peer's run, opened by its own
 * identity (the tree row's `openTarget`), in the `/ws/agent` protocol. Its node serves the agent's own stream; this node
 * relays it (`PeerRunStreamSession`) over the studio's channel (autobyteus-500 FU-011: registered only where remote
 * collaboration is composed). A target that is not an agent or team run closes the socket.
 */
export async function registerPeerRunWebsocket(app: FastifyInstance, channel: RemoteRunChannel): Promise<void> {
  registerGatedWebSocketRoute<FastifyRequest<{ Params: PeerRunParams }>>(app, "/ws/peer-run/:nodeId/:runKind/:runId/:agentRunId", (socket, req) => {
    const { nodeId, runKind, runId, agentRunId } = req.params;
    if (runKind !== "agent" && runKind !== "agent_team") {
      socket.send(JSON.stringify({ type: "ERROR", payload: { code: "PEER_RUN_UNAVAILABLE", message: "This peer run cannot be opened here.",
        error_scope: null, error_effect: null, turn_id: null, occurred_at: new Date().toISOString() } }));
      socket.close(4004);
      return;
    }
    const session = new PeerRunStreamSession({ channel, nodeId, targetRoot: { kind: runKind, runId }, agentRunId,
      sink: { send: (message) => socket.send(JSON.stringify(message)), close: (code) => socket.close(code) } });
    socket.on("message", (data: unknown) => { void session.handleMessage(String(data)); });
    socket.on("close", () => session.close());
    socket.on("error", () => session.close());
    session.start();
  });
}
