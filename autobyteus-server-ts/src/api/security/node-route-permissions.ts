import type { ClientKind } from "../../node-access/domain/client-identity.js";

/**
 * Route permissions (node access model NA-2, NA-6, NA-7): which client kinds may use which endpoint. Deny by default:
 * an endpoint not listed here is open to owners and phones only, and a WebSocket not listed among the phone
 * WebSocket routes is open to owners only.
 */
export type RouteAccess =
  /** Needed before a client holds a credential (NA-6): network admission still applies. */
  | Readonly<{ kind: "exempt" }>
  /** A tool endpoint with its own token (`/mcp/gateway`, NA-12): its own gate checks the token after admission. */
  | Readonly<{ kind: "tool_endpoint" }>
  | Readonly<{ kind: "clients"; permitted: ReadonlySet<ClientKind> }>;

/** A request as the route permissions see it. */
export type RouteRequest = Readonly<{
  method: string;
  /**
   * The registered route pattern the request matched (`/rest/files/*`, `/ws/agent/:runId`), or, when it matched none,
   * its path without query. The pattern, not the raw path, decides: a path such as `/rest/files/../health` is the
   * files route, never the exempt health route.
   */
  route: string;
  isWebSocketUpgrade: boolean;
}>;

/**
 * Phone WebSocket routes: the WebSocket route patterns a paired phone's credential may open. A WebSocket route added
 * later stays closed to phones until it is listed here.
 */
export const PHONE_WEBSOCKET_ROUTES: ReadonlySet<string> = new Set([
  "/ws/agent/:runId",
  "/ws/agent-team/:teamRunId",
  "/ws/agent-org/:orgRunId",
  "/ws/agent-collaboration/:runId",
  "/ws/projects",
  "/ws/agent-package-definitions",
  "/ws/file-explorer/:workspaceId",
  "/ws/node-desktop",
]);

const EXEMPT: RouteAccess = Object.freeze({ kind: "exempt" });
const TOOL_ENDPOINT: RouteAccess = Object.freeze({ kind: "tool_endpoint" });
const clients = (...permitted: ClientKind[]): RouteAccess => Object.freeze({ kind: "clients", permitted: new Set(permitted) });

const OWNER = clients("owner");
const OWNER_AND_PHONE = clients("owner", "phone");
const PEER = clients("peer");
const MEMORY_SYNC_SOURCE = clients("memory_sync_source");

const EXEMPT_EXCHANGES = new Set([
  "/rest/remote-access/pairing-exchanges",
  "/rest/node-access/setup-exchanges",
  "/rest/remote/peer-pairing-exchanges",
]);

/** Owner actions (NA-7): settings, phone pairing and devices, node update, owner credentials, the MCP gateway token. */
const isOwnerAction = (path: string): boolean =>
  path === "/rest/remote-access/network"
  || path.startsWith("/rest/remote-access/network/")
  || path === "/rest/remote-access/settings"
  || path === "/rest/remote-access/pairing-sessions"
  || path.startsWith("/rest/remote-access/pairing-sessions/")
  || path === "/rest/remote-access/devices"
  || path.startsWith("/rest/remote-access/devices/")
  || path === "/rest/node-update"
  || path === "/rest/node-access"
  || path.startsWith("/rest/node-access/")
  || path === "/rest/mcp-gateway"
  || path.startsWith("/rest/mcp-gateway/");

const isPath = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);

export const routeAccessFor = (request: RouteRequest): RouteAccess => {
  const method = request.method.toUpperCase();
  const path = request.route;

  if (method === "OPTIONS" && !request.isWebSocketUpgrade) return EXEMPT;
  if (isPath(path, "/mobile")) return EXEMPT;
  if (path === "/rest/health") return EXEMPT;
  if (path === "/rest/remote-access/status" && method === "GET") return EXEMPT;
  if (EXEMPT_EXCHANGES.has(path) && method === "POST") return EXEMPT;
  if (isPath(path, "/mcp/gateway")) return TOOL_ENDPOINT;
  if (isPath(path, "/rest/remote")) return PEER;
  if (isPath(path, "/rest/memory-sync")) return MEMORY_SYNC_SOURCE;
  if (isOwnerAction(path)) return OWNER;
  if (request.isWebSocketUpgrade) {
    return PHONE_WEBSOCKET_ROUTES.has(path) ? OWNER_AND_PHONE : OWNER;
  }
  return OWNER_AND_PHONE;
};
