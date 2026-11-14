import type { FastifyInstance } from "fastify";
import { parseRunStatusClientMessage, serializeRunStatusMessage } from "@autobyteus/collaboration-stream-contracts";
import type { RunStatusService } from "../../agent-collaboration/execution/run-status-service.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

/**
 * `/ws/run-status` (autobyteus-461 SR-082, SR-083): each run's statuses read by run ID from the run itself, and its rows'
 * change notice. One connection per window; it subscribes to the runs it shows. A message that cannot be read is ignored.
 */
export async function registerRunStatusWebsocket(app: FastifyInstance, service: RunStatusService): Promise<void> {
  registerGatedWebSocketRoute(app, "/ws/run-status", (socket) => {
    const connection = service.connect((message) => socket.send(serializeRunStatusMessage(message)));
    socket.on("message", (data: unknown) => {
      let message;
      try { message = parseRunStatusClientMessage(String(data)); } catch { return; }
      if (message.type === "SUBSCRIBE") void connection.subscribe(message.payload.runs);
      else connection.unsubscribe(message.payload.runs);
    });
    socket.on("close", () => connection.close());
    socket.on("error", () => connection.close());
  });
}
