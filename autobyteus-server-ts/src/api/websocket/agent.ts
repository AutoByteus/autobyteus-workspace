import type { FastifyInstance } from "fastify";
import {
  AgentStreamHandler,
  AgentTeamStreamHandler,
  createErrorMessage,
  getAgentStreamHandler,
  getAgentTeamStreamHandler,
  type WebSocketConnection,
} from "../../services/agent-streaming/index.js";

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

export async function registerAgentWebsocket(
  app: FastifyInstance,
  agentHandler: AgentStreamHandler = getAgentStreamHandler(),
  teamHandler: AgentTeamStreamHandler = getAgentTeamStreamHandler(),
): Promise<void> {
  app.get("/ws/agent/:runId", { websocket: true }, (connection: unknown, req) => {
    let sessionId: string | null = null;
    const { runId } = req.params as AgentParams;
    const socket = (connection as { socket?: unknown }).socket ?? connection;
    if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
      logger.error("Agent websocket missing underlying socket; check fastify websocket plugin setup.");
      return;
    }

    const connectionAdapter: WebSocketConnection = {
      send: (data) => (socket as { send: (payload: string) => void }).send(data),
      close: (code) => (socket as { close: (code?: number) => void }).close(code),
    };

    void agentHandler
      .connect(connectionAdapter, runId)
      .then((id) => {
        sessionId = id;
      })
      .catch((error) => {
        logger.error(`Error connecting agent websocket: ${String(error)}`);
        (socket as { close: (code?: number) => void }).close(1011);
      });

    (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
      if (!sessionId) {
        (socket as { send: (payload: string) => void }).send(
          createErrorMessage(
            "SESSION_NOT_READY",
            "Session is not ready yet. Retry after CONNECTED message.",
          ).toJson(),
        );
        return;
      }
      const message = data.toString();
      void agentHandler.handleMessage(sessionId, message);
    });

    (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
      if (!sessionId) {
        return;
      }
      void agentHandler.disconnect(sessionId);
    });

    (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", (error) => {
      logger.error(`Agent websocket error: ${String(error)}`);
    });

    logger.info(`Agent websocket attached for run ${runId}`);
  });

  app.get("/ws/agent-team/:teamRunId", { websocket: true }, (connection: unknown, req) => {
    let sessionId: string | null = null;
    const { teamRunId } = req.params as TeamParams;
    const socket = (connection as { socket?: unknown }).socket ?? connection;
    if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
      logger.error("Agent team websocket missing underlying socket; check fastify websocket plugin setup.");
      return;
    }

    const connectionAdapter: WebSocketConnection = {
      send: (data) => (socket as { send: (payload: string) => void }).send(data),
      close: (code) => (socket as { close: (code?: number) => void }).close(code),
    };

    void teamHandler
      .connect(connectionAdapter, teamRunId)
      .then((id) => {
        sessionId = id;
      })
      .catch((error) => {
        logger.error(`Error connecting agent team websocket: ${String(error)}`);
        (socket as { close: (code?: number) => void }).close(1011);
      });

    (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
      if (!sessionId) {
        (socket as { send: (payload: string) => void }).send(
          createErrorMessage(
            "SESSION_NOT_READY",
            "Session is not ready yet. Retry after CONNECTED message.",
          ).toJson(),
        );
        return;
      }
      const message = data.toString();
      void teamHandler.handleMessage(sessionId, message);
    });

    (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
      if (!sessionId) {
        return;
      }
      void teamHandler.disconnect(sessionId);
    });

    (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", (error) => {
      logger.error(`Agent team websocket error: ${String(error)}`);
    });

    logger.info(`Agent team websocket attached for team run ${teamRunId}`);
  });
}
