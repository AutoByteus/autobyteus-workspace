import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import {
  AgentStreamHandler,
  AgentTeamStreamHandler,
  createErrorMessage,
  getAgentStreamHandler,
  getAgentTeamStreamHandler,
  type WebSocketConnection,
} from "../../services/agent-streaming/index.js";
import { AgentOrgStreamHandler } from "../../services/agent-streaming/agent-org-stream-handler.js";
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

/** An agent or team run stream: messages wait for the session, which the client learns from its CONNECTED message. */
const attachRunStream = (
  socket: WebSocket,
  handler: AgentStreamHandler | AgentTeamStreamHandler,
  runId: string,
  label: string,
): void => {
  let sessionId: string | null = null;

  void handler
    .connect(connectionAdapterFor(socket), runId)
    .then((id) => {
      sessionId = id;
    })
    .catch((error) => {
      logger.error(`Error connecting ${label} websocket: ${String(error)}`);
      socket.close(1011);
    });

  socket.on("message", (data: Buffer) => {
    if (!sessionId) {
      socket.send(
        createErrorMessage(
          "SESSION_NOT_READY",
          "Session is not ready yet. Retry after CONNECTED message.",
        ).toJson(),
      );
      return;
    }
    void handler.handleMessage(sessionId, data.toString());
  });

  socket.on("close", () => {
    if (!sessionId) {
      return;
    }
    void handler.disconnect(sessionId);
  });

  socket.on("error", (error) => {
    logger.error(`${label} websocket error: ${String(error)}`);
  });
};

/** An org or agent-collaboration stream: messages are handled once its session is connected. */
const attachRootStream = (
  socket: WebSocket,
  handler: AgentOrgStreamHandler | AgentCollaborationStreamHandler,
  runId: string,
  label: string,
): void => {
  void handler.connect(connectionAdapterFor(socket), runId).then((sessionId) => {
    if (!sessionId) return;
    socket.on("message", (data: Buffer) => {
      void handler.handleMessage(sessionId, data.toString());
    });
    socket.on("close", () => handler.disconnect(sessionId));
    socket.on("error", (cause) => logger.error(`${label} websocket error: ${String(cause)}`));
  }).catch((cause) => {
    logger.error(`Error connecting ${label} websocket: ${String(cause)}`);
    socket.close(1011);
  });
};

export async function registerAgentWebsocket(
  app: FastifyInstance,
  agentHandler: AgentStreamHandler = getAgentStreamHandler(),
  teamHandler: AgentTeamStreamHandler = getAgentTeamStreamHandler(),
  orgHandler?: AgentOrgStreamHandler,
  agentCollaborationHandler?: AgentCollaborationStreamHandler,
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

  if (orgHandler) {
    registerGatedWebSocketRoute<FastifyRequest<{ Params: OrgParams }>>(app, "/ws/agent-org/:orgRunId", (socket, req) => {
      attachRootStream(socket, orgHandler, req.params.orgRunId, "AgentOrg");
    });
  }

  if (agentCollaborationHandler) {
    registerGatedWebSocketRoute<FastifyRequest<{ Params: AgentCollaborationParams }>>(app, "/ws/agent-collaboration/:runId", (socket, req) => {
      attachRootStream(socket, agentCollaborationHandler, req.params.runId, "Agent collaboration");
    });
  }
}
