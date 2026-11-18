import { describe, expect, it } from "vitest";
import { PHONE_WEBSOCKET_ROUTES, routeAccessFor } from "../../../src/api/security/node-route-permissions.js";

/** Node access model NA-2 (deny by default), NA-6 (exempt endpoints), NA-7 (route permissions by client kind). */

const http = (method: string, route: string) => routeAccessFor({ method, route, isWebSocketUpgrade: false });
const upgrade = (route: string) => routeAccessFor({ method: "GET", route, isWebSocketUpgrade: true });
const permitted = (access: ReturnType<typeof routeAccessFor>) => (access.kind === "clients" ? [...access.permitted].sort() : access.kind);

describe("route permissions", () => {
  it("NA-6: only the endpoints a client needs before it holds a credential are exempt", () => {
    expect(http("GET", "/rest/health").kind).toBe("exempt");
    expect(http("GET", "/rest/remote-access/status").kind).toBe("exempt");
    expect(http("GET", "/mobile").kind).toBe("exempt");
    expect(http("GET", "/mobile/*").kind).toBe("exempt");
    expect(http("POST", "/rest/remote-access/pairing-exchanges").kind).toBe("exempt");
    expect(http("POST", "/rest/node-access/setup-exchanges").kind).toBe("exempt");
    expect(http("POST", "/rest/remote/peer-pairing-exchanges").kind).toBe("exempt");
    expect(http("OPTIONS", "*").kind).toBe("exempt");
    // The same paths with another method, and an upgrade, are not exempt.
    expect(http("PUT", "/rest/remote-access/status").kind).toBe("clients");
    expect(http("GET", "/rest/node-access/setup-exchanges").kind).toBe("clients");
    expect(routeAccessFor({ method: "OPTIONS", route: "/graphql", isWebSocketUpgrade: true }).kind).toBe("clients");
  });

  it("NA-2: an endpoint nobody listed needs an owner or phone credential; a WebSocket nobody listed, an owner's", () => {
    expect(permitted(http("POST", "/rest/a-route-added-later"))).toEqual(["owner", "phone"]);
    expect(permitted(http("GET", "/rest/files/*"))).toEqual(["owner", "phone"]);
    expect(permitted(http("POST", "/graphql"))).toEqual(["owner", "phone"]);
    expect(permitted(http("GET", "/graphql"))).toEqual(["owner", "phone"]);
    expect(permitted(upgrade("/ws/a-socket-added-later"))).toEqual(["owner"]);
    expect(permitted(upgrade("/graphql"))).toEqual(["owner"]);
    expect(permitted(upgrade("/ws/terminal/:sessionId"))).toEqual(["owner"]);
    for (const route of PHONE_WEBSOCKET_ROUTES) expect(permitted(upgrade(route))).toEqual(["owner", "phone"]);
  });

  it("NAS-08 owner actions are open to owners only; NAS-24 peers reach only /rest/remote/*; NAS-26 memory sync sources only the hub routes", () => {
    for (const route of [
      "/rest/remote-access/settings", "/rest/remote-access/network", "/rest/remote-access/network/local-networks/:networkId",
      "/rest/remote-access/pairing-sessions", "/rest/remote-access/pairing-sessions/:sessionId", "/rest/remote-access/devices",
      "/rest/remote-access/devices/revoked", "/rest/remote-access/devices/:deviceId", "/rest/node-update",
      "/rest/node-access/setup-codes", "/rest/node-access/owner-credentials", "/rest/node-access/owner-credentials/:credentialId",
      "/rest/mcp-gateway/token", "/rest/mcp-gateway/token/regenerate",
    ]) expect(permitted(http("POST", route))).toEqual(["owner"]);
    expect(permitted(http("POST", "/rest/remote/delegated-runs"))).toEqual(["peer"]);
    expect(permitted(upgrade("/rest/remote/run-observations"))).toEqual(["peer"]);
    expect(permitted(http("POST", "/rest/memory-sync/v1/batches"))).toEqual(["memory_sync_source"]);
    // `/rest/remote-access/*` is not a peer route.
    expect(permitted(http("GET", "/rest/remote-access/devices"))).toEqual(["owner"]);
  });

  it("NAS-39 NAS-40 node files are an explicit owner-and-phone row: never a peer's or a memory sync source's", () => {
    expect(permitted(http("GET", "/rest/node-files/content"))).toEqual(["owner", "phone"]);
  });

  it("NAS-25 the MCP gateway is a tool endpoint: its own token decides after admission", () => {
    expect(http("POST", "/mcp/gateway").kind).toBe("tool_endpoint");
  });

  it("decides by the matched route pattern, so `..` in a path never reaches an exempt row", () => {
    // The router matched `/rest/files/*` for `/rest/files/../health`: the gate is given that pattern.
    expect(permitted(http("GET", "/rest/files/*"))).toEqual(["owner", "phone"]);
    // Without a match, the raw path decides, and it is not `/rest/health`.
    expect(permitted(http("GET", "/rest/files/../health"))).toEqual(["owner", "phone"]);
  });
});
