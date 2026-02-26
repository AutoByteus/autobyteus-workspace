import type { FastifyInstance } from "fastify";
import {
  AgentStreamHandler,
  AgentTeamStreamHandler,
  getAgentStreamHandler,
  getAgentTeamStreamHandler,
  type WebSocketConnection,
} from "../../services/agent-streaming/index.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentParams = {
  agentId: string;
};

type TeamParams = {
  teamId: string;
};

export async function registerAgentWebsocket(
  app: FastifyInstance,
  agentHandler: AgentStreamHandler = getAgentStreamHandler(),
  teamHandler: AgentTeamStreamHandler = getAgentTeamStreamHandler(),
): Promise<void> {
  app.get("/ws/agent/:agentId", { websocket: true }, (connection: unknown, req) => {
    let sessionId: string | null = null;
    const { agentId } = req.params as AgentParams;
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
      .connect(connectionAdapter, agentId)
      .then((id) => {
        sessionId = id;
      })
      .catch((error) => {
        logger.error(`Error connecting agent websocket: ${String(error)}`);
        (socket as { close: (code?: number) => void }).close(1011);
      });

    (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
      if (!sessionId) {
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

    logger.info(`Agent websocket attached for agent ${agentId}`);
  });

  app.get("/ws/agent-team/:teamId", { websocket: true }, (connection: unknown, req) => {
    let sessionId: string | null = null;
    const { teamId } = req.params as TeamParams;
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
      .connect(connectionAdapter, teamId)
      .then((id) => {
        sessionId = id;
      })
      .catch((error) => {
        logger.error(`Error connecting agent team websocket: ${String(error)}`);
        (socket as { close: (code?: number) => void }).close(1011);
      });

    (socket as { on: (event: string, cb: (data: Buffer) => void) => void }).on("message", (data: Buffer) => {
      if (!sessionId) {
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

    logger.info(`Agent team websocket attached for team ${teamId}`);
  });
}
