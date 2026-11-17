import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import {
  createErrorMessage,
  type AgentStreamHandler,
  type AgentTeamStreamHandler,
  type WebSocketConnection,
} from "../../services/agent-streaming/index.js";
import type { AgentOrgStreamHandler } from "../../services/agent-streaming/agent-org-stream-handler.js";
import type { AgentCollaborationStreamHandler } from "../../services/agent-streaming/agent-collaboration-stream-handler.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentParams = {
  runId: string;
};

type TeamParams = {
  teamRunId: string;
};
type OrgParams = { orgRunId: string };
type AgentCollaborationParams = { runId: string };

const connectionAdapterFor = (socket: WebSocket): WebSocketConnection => ({
  send: (data) => socket.send(data),
  close: (code) => socket.close(code),
});

/** What every run stream's handler offers its socket: a session per connection. */
type RunStreamHandler = Readonly<{
  connect(connection: WebSocketConnection, runId: string): Promise<string | null>;
  handleMessage(sessionId: string, raw: string): Promise<void>;
  disconnect(sessionId: string): Promise<void> | void;
}>;

/**
 * One run stream's socket (agent, team, org and agent collaboration; autobyteus-500 FU-036): its listeners are attached
 * at once, so no message is dropped. While the session connects, a message is answered `SESSION_NOT_READY` (the client
 * retries after `CONNECTED`); once connected, messages go to the session. `null` from `connect` is a refusal the handler
 * already answered and closed. A socket closed while connecting ends the session as soon as it exists.
 */
const attachRunStream = (socket: WebSocket, handler: RunStreamHandler, runId: string, label: string): void => {
  let state: Readonly<{ kind: "connecting" }> | Readonly<{ kind: "ready"; sessionId: string }> | Readonly<{ kind: "refused" }>
    | Readonly<{ kind: "closed" }> = { kind: "connecting" };

  socket.on("message", (data: Buffer) => {
    if (state.kind === "connecting") {
      socket.send(createErrorMessage("SESSION_NOT_READY", "Session is not ready yet. Retry after CONNECTED message.").toJson());
      return;
    }
    if (state.kind === "ready") void handler.handleMessage(state.sessionId, data.toString());
  });

  socket.on("close", () => {
    if (state.kind === "ready") void handler.disconnect(state.sessionId);
    state = { kind: "closed" };
  });

  socket.on("error", (error) => {
    logger.error(`${label} websocket error: ${String(error)}`);
  });

  void handler
    .connect(connectionAdapterFor(socket), runId)
    .then((sessionId) => {
      if (state.kind === "closed") {
        if (sessionId) void handler.disconnect(sessionId);
        return;
      }
      state = sessionId ? { kind: "ready", sessionId } : { kind: "refused" };
    })
    .catch((error) => {
      logger.error(`Error connecting ${label} websocket: ${String(error)}`);
      socket.close(1011);
    });
};

export async function registerAgentWebsocket(
  app: FastifyInstance,
  agentHandler: AgentStreamHandler,
  teamHandler: AgentTeamStreamHandler,
  orgHandler: AgentOrgStreamHandler,
  agentCollaborationHandler: AgentCollaborationStreamHandler,
): Promise<void> {
  registerGatedWebSocketRoute<FastifyRequest<{ Params: AgentParams }>>(app, "/ws/agent/:runId", (socket, req) => {
    const { runId } = req.params;
    attachRunStream(socket, agentHandler, runId, "Agent");
    logger.info(`Agent websocket attached for run ${runId}`);
  });

  registerGatedWebSocketRoute<FastifyRequest<{ Params: TeamParams }>>(app, "/ws/agent-team/:teamRunId", (socket, req) => {
    const { teamRunId } = req.params;
    attachRunStream(socket, teamHandler, teamRunId, "Agent team");
    logger.info(`Agent team websocket attached for team run ${teamRunId}`);
  });

  registerGatedWebSocketRoute<FastifyRequest<{ Params: OrgParams }>>(app, "/ws/agent-org/:orgRunId", (socket, req) => {
    attachRunStream(socket, orgHandler, req.params.orgRunId, "AgentOrg");
  });

  registerGatedWebSocketRoute<FastifyRequest<{ Params: AgentCollaborationParams }>>(app, "/ws/agent-collaboration/:runId", (socket, req) => {
    attachRunStream(socket, agentCollaborationHandler, req.params.runId, "Agent collaboration");
  });
}
