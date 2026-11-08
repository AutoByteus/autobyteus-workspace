import type { FastifyInstance } from "fastify";
import { getClientIdentity, WEBSOCKET_ACCESS_TOKEN_QUERY_KEY } from "../security/node-access-gate.js";
import {
  resolveNodeDesktop,
  type NodeDesktopTarget,
} from "../../node-desktop/node-desktop-availability.js";
import { NodeDesktopStream, type NodeDesktopViewerSocket } from "../../node-desktop/node-desktop-stream.js";
import { NodeDesktopViewers } from "../../node-desktop/node-desktop-viewers.js";
import { isNodeDesktopMode, type NodeDesktopMode } from "../../node-desktop/rfb-viewer-input-filter.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

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
 * Order: the node access gate (before this runs) → validate the query → resolve the node desktop →
 * admit the stream into the viewer registry → start it. Nothing opens towards the desktop before the
 * last step.
 * Close codes: the gate's 4401/4403; 4400 NODE_DESKTOP_INVALID_REQUEST or NODE_DESKTOP_VIEWER_PROTOCOL;
 * 4404 NODE_DESKTOP_UNAVAILABLE; 4429 NODE_DESKTOP_TOO_MANY_VIEWERS; 4502 NODE_DESKTOP_DISCONNECTED. A
 * revoked phone's open stream ends with 4403 and the revocation code (the gate's open-socket registry).
 */
export async function registerNodeDesktopWebsocket(
  app: FastifyInstance,
  resolveTarget: () => NodeDesktopTarget | null = () => resolveNodeDesktop(process.env),
  viewers: NodeDesktopViewers = new NodeDesktopViewers(),
): Promise<void> {
  registerGatedWebSocketRoute(app, "/ws/node-desktop", (webSocket, req) => {
    const socket = webSocket as unknown as NodeDesktopViewerSocket;
    const refuse = (close: { code: number; reason: string }): void => {
      try {
        socket.close(close.code, close.reason);
      } catch {
        // The viewer socket is already gone.
      }
    };

    const viewer = getClientIdentity(req);
    const mode = parseNodeDesktopStreamQuery(req.url);
    if (!viewer || !mode) return refuse(INVALID_REQUEST);
    const target = resolveTarget();
    if (!target) return refuse(UNAVAILABLE);
    const stream = new NodeDesktopStream({ socket, target, mode, viewerKind: viewer.kind });
    const admission = viewers.admit(viewer, stream, mode);
    if (admission !== "admitted") return refuse(admission.refused);
    stream.start();
  });
}
