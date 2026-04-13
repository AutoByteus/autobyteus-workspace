import type { FastifyInstance } from "fastify";
import {
  getApplicationSessionStreamHandler,
  type ApplicationSessionStreamHandler,
} from "../../application-sessions/streaming/application-session-stream-handler.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type Params = {
  applicationSessionId: string;
};

export async function registerApplicationSessionWebsocket(
  app: FastifyInstance,
  handler: ApplicationSessionStreamHandler = getApplicationSessionStreamHandler(),
): Promise<void> {
  (app as any).get("/ws/application-session/:applicationSessionId", { websocket: true }, (connection: unknown, req: { params: Params }) => {
    let connectionId: string | null = null;
    const { applicationSessionId } = req.params;
    const socket = (connection as { socket?: unknown }).socket ?? connection;
    if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
      logger.error("Application session websocket missing underlying socket.");
      return;
    }

    const adapter = {
      send: (data: string) => (socket as { send: (payload: string) => void }).send(data),
      close: (code?: number) => (socket as { close: (code?: number) => void }).close(code),
    };

    void handler
      .connect(adapter, applicationSessionId)
      .then((id) => {
        connectionId = id;
      })
      .catch((error) => {
        logger.error(`Error connecting application session websocket: ${String(error)}`);
        (socket as { close: (code?: number) => void }).close(1011);
      });

    (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
      if (connectionId) {
        handler.disconnect(connectionId);
      }
    });

    (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", (error) => {
      logger.error(`Application session websocket error: ${String(error)}`);
    });

    logger.info(`Application session websocket attached for session ${applicationSessionId}`);
  });
}
