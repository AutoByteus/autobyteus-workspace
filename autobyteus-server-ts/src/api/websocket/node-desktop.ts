import type { FastifyInstance } from "fastify";
import { WEBSOCKET_ACCESS_TOKEN_QUERY_KEY } from "../../remote-access/domain/models.js";
import {
  resolveNodeDesktop,
  type NodeDesktopTarget,
} from "../../node-desktop/node-desktop-availability.js";
import {
  NODE_DESKTOP_CLOSE,
  NodeDesktopStream,
  type NodeDesktopViewerSocket,
} from "../../node-desktop/node-desktop-stream.js";
import { isNodeDesktopMode, type NodeDesktopMode } from "../../node-desktop/rfb-viewer-input-filter.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";

const INVALID_REQUEST = { code: 4400, reason: "NODE_DESKTOP_INVALID_REQUEST" } as const;
const UNAVAILABLE = { code: 4404, reason: "NODE_DESKTOP_UNAVAILABLE" } as const;

/**
 * The stream query: exactly one `mode` (`view` or `control`) and at most one access token.
 * Anything else, including a host, port, target or URL, refuses the request.
 */
export const parseNodeDesktopStreamQuery = (requestUrl: string): NodeDesktopMode | null => {
  let params: URLSearchParams;
  try {
    params = new URL(requestUrl, "http://autobyteus.local").searchParams;
  } catch {
    return null;
  }
  const keys = [...params.keys()];
  const modes = params.getAll("mode");
  const tokens = params.getAll(WEBSOCKET_ACCESS_TOKEN_QUERY_KEY);
  if (modes.length !== 1 || tokens.length > 1) return null;
  if (keys.some((key) => key !== "mode" && key !== WEBSOCKET_ACCESS_TOKEN_QUERY_KEY)) return null;
  return isNodeDesktopMode(modes[0]!) ? modes[0] : null;
};

/**
 * `/ws/node-desktop?mode=view|control[&access_token=]`: one viewer of this node's node desktop.
 * Order: authorize with the shared WebSocket policy → validate the query → resolve the node
 * desktop → start the stream. Nothing opens towards the desktop before the last step.
 * Close codes: the shared policy's 4401/4403/4404; 4400 NODE_DESKTOP_INVALID_REQUEST or
 * NODE_DESKTOP_VIEWER_PROTOCOL; 4404 NODE_DESKTOP_UNAVAILABLE; 4502 NODE_DESKTOP_DISCONNECTED.
 */
export async function registerNodeDesktopWebsocket(
  app: FastifyInstance,
  resolveTarget: () => NodeDesktopTarget | null = () => resolveNodeDesktop(process.env),
): Promise<void> {
  app.get("/ws/node-desktop", { websocket: true }, (connection: unknown, req) => {
    const socket = connection as NodeDesktopViewerSocket;
    let closed = false;
    let streaming = false;

    const refuse = (close: { code: number; reason: string }): void => {
      closed = true;
      try {
        socket.close(close.code, close.reason);
      } catch {
        // The viewer socket is already gone.
      }
    };

    // An RFB viewer speaks only after the node desktop's version string, so any byte before the
    // stream starts is a protocol error.
    socket.on("message", () => {
      if (!streaming && !closed) refuse(NODE_DESKTOP_CLOSE.viewerProtocol);
    });
    socket.on("close", () => {
      closed = true;
    });

    void (async () => {
      let viewerKind: string;
      try {
        viewerKind = (await authorizeRemoteAccessWebSocket(req)).mode;
      } catch (error) {
        if (!closed) closeSocketForRemoteAccessRejection(socket, error, req);
        closed = true;
        return;
      }
      if (closed) return;
      const mode = parseNodeDesktopStreamQuery(req.url);
      if (!mode) return refuse(INVALID_REQUEST);
      const target = resolveTarget();
      if (!target) return refuse(UNAVAILABLE);
      streaming = true;
      new NodeDesktopStream({ socket, target, mode, viewerKind }).start();
    })();
  });
}
