/**
 * Close options every Fastify server the node runs uses: closing never waits on a client.
 *
 * With default options Fastify's `close()` waits for client connections to end, and a connection
 * that never sent a request (browsers open such spare connections) holds the close indefinitely.
 * Fastify runs `onClose` only after the HTTP server has closed, so one such connection held the
 * studio's run cleanup until the 10 s shutdown bound (autobyteus-339, FU-008; reproduced in P-002
 * and P-003). With `forceCloseConnections: true` Fastify closes every remaining connection after the
 * `preClose` hooks (native command drain, WebSocket close) and before `server.close()`. A request
 * still in flight at that point gets no response.
 */
export const SERVER_CLOSE_OPTIONS = { forceCloseConnections: true } as const;
