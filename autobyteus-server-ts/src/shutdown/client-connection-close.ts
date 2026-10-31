import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type { FastifyInstance } from "fastify";

/**
 * How long a request already in progress at shutdown may run before its connection is closed. Long
 * against measured handler times (`createAgentRun` 54–175 ms), short against the 10 s shutdown bound.
 */
export const IN_FLIGHT_REQUEST_GRACE_MS = 2_000;

type GraceTimers = Readonly<{
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}>;

const defaultTimers: GraceTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Closing a server never waits on a client beyond a short grace (autobyteus-339, REQ-001).
 *
 * Fastify runs `onClose` (the studio's run cleanup) only after the HTTP server has closed, and with
 * default options a connection that never sent a request (browsers open such spare connections) held
 * that close until the shutdown bound (FU-008). Cutting every connection instead cut requests in
 * progress, leaving runs prepared but never activated or created without the client learning their
 * ID (F-API-001). So this hook, at close: destroys connections that never sent a request (and any that
 * arrive once it has started); lets requests in progress finish within the grace (new requests on an
 * open connection already get Fastify's 503 while closing); then closes every remaining connection.
 * Upgraded sockets are left to the WebSocket plugin, which closes its clients in its own `preClose`.
 *
 * Install it as the app's **last** `preClose` hook (Fastify runs them in registration order), so its
 * final close directly precedes `server.close()`. A long-lived HTTP stream would spend the whole grace:
 * its owner must close it before the server closes, as `AgentToolsMcpHost` does.
 */
export const installClientConnectionClose = (
  app: FastifyInstance,
  options: Readonly<{ graceMs?: number; timers?: GraceTimers }> = {},
): void => {
  const graceMs = options.graceMs ?? IN_FLIGHT_REQUEST_GRACE_MS;
  const timers = options.timers ?? defaultTimers;
  const connections = new Set<Socket>();
  const usedConnections = new WeakSet<Socket>();
  let requestsInProgress = 0;
  let closing = false;
  let onDrained: (() => void) | null = null;

  app.server.on("connection", (socket: Socket) => {
    if (closing) { socket.destroy(); return; }
    connections.add(socket);
    socket.once("close", () => connections.delete(socket));
  });
  app.server.on("request", (request: IncomingMessage, response: ServerResponse) => {
    usedConnections.add(request.socket);
    requestsInProgress += 1;
    response.once("close", () => {
      requestsInProgress -= 1;
      if (requestsInProgress === 0) onDrained?.();
    });
  });
  app.server.on("upgrade", (_request: IncomingMessage, socket: Socket) => { connections.delete(socket); });

  app.addHook("preClose", async () => {
    closing = true;
    for (const socket of connections) if (!usedConnections.has(socket)) socket.destroy();
    if (requestsInProgress > 0) {
      await new Promise<void>((resolve) => {
        const timer = timers.setTimeout(() => { onDrained = null; resolve(); }, graceMs);
        onDrained = () => { timers.clearTimeout(timer); onDrained = null; resolve(); };
      });
    }
    app.server.closeAllConnections();
  });
};
