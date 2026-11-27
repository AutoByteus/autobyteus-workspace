import http from "node:http";
import type net from "node:net";
import tls from "node:tls";
import { Agent, type Dispatcher } from "undici";

/** Where a peer is reached: its record's `address`, and its `machine` when it was paired over the private network. */
export type PeerRoute = Readonly<{ address: string; machine: string | null }>;

/**
 * A request's way to the peer: the URL to call, the path with query it signs (as the receiving node sees it), and the
 * dispatcher that carries it (`null`: directly; otherwise through this node's network relay). Every sender passes the
 * dispatcher to `fetch` or `WebSocket` as given.
 */
export type PeerTarget =
  | Readonly<{ kind: "direct"; url: URL; pathWithQuery: string; dispatcher: null }>
  | Readonly<{ kind: "relayed"; url: URL; pathWithQuery: string; dispatcher: Dispatcher }>
  | Readonly<{ kind: "unavailable"; detail: string }>;

/** The `fetch` option that carries a request the way its target says (nothing for a direct target). */
export const fetchOptionsOf = (target: Readonly<{ dispatcher: Dispatcher | null }>): RequestInit =>
  (target.dispatcher ? { dispatcher: target.dispatcher } : {}) as RequestInit;

/** The network program's local relay (role action `relay`): an HTTP CONNECT proxy on 127.0.0.1, its credential new at every start. */
export type NetworkRelay = Readonly<{ port: number; credential: string }>;

/** The user name of the relay's Basic proxy credential; the password is the relay's credential (AutoByteus Network program). */
export const NETWORK_RELAY_USER = "autobyteus";
/** How long the relay may take to open a tunnel. */
export const NETWORK_RELAY_CONNECT_TIMEOUT_MS = 10_000;

export const networkRelayAuthorization = (credential: string): string =>
  `Basic ${Buffer.from(`${NETWORK_RELAY_USER}:${credential}`, "utf8").toString("base64")}`;

/**
 * A request's URL and signed path at a peer (NA-9): the URL is the peer's address plus the node route; the signed path
 * is the node route with its query, as the receiving node sees it. A peer behind a gateway at a base path
 * (`https://gateway.example.com/autobyteus`) receives the route without that base path, so the base path is never
 * signed: one rule on both sides.
 */
export const peerRequestTarget = (address: string, routePath: string): Readonly<{ url: URL; pathWithQuery: string }> => {
  const url = new URL(`${address.replace(/\/+$/, "")}${routePath}`);
  const basePath = new URL(address).pathname.replace(/\/+$/, "");
  const nodePath = basePath && url.pathname.startsWith(`${basePath}/`) ? url.pathname.slice(basePath.length) : url.pathname;
  return Object.freeze({ url, pathWithQuery: `${nodePath}${url.search}` });
};

/** Opens a tunnel to `host:port` through the relay (HTTP CONNECT with the relay's credential); TLS over it for `https:`. */
export const openRelayTunnel = (relay: NetworkRelay, target: Readonly<{ hostname: string; port: number; tls: boolean; servername?: string }>): Promise<net.Socket> =>
  new Promise((resolve, reject) => {
    const host = target.hostname.includes(":") && !target.hostname.startsWith("[") ? `[${target.hostname}]` : target.hostname;
    const request = http.request({
      host: "127.0.0.1", port: relay.port, method: "CONNECT", path: `${host}:${target.port}`,
      headers: { host: `${host}:${target.port}`, "proxy-authorization": networkRelayAuthorization(relay.credential) },
    });
    request.setTimeout(NETWORK_RELAY_CONNECT_TIMEOUT_MS, () => request.destroy(Object.assign(new Error("the network relay did not open the tunnel in time"), { code: "ETIMEDOUT" })));
    request.once("connect", (response, socket, head) => {
      request.setTimeout(0);
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(Object.assign(new Error(`the network relay answered HTTP ${response.statusCode}`), { relayStatus: response.statusCode }));
        return;
      }
      if (head.length) socket.unshift(head);
      if (!target.tls) return resolve(socket);
      const secure = tls.connect({ socket, servername: target.servername ?? target.hostname });
      secure.once("secureConnect", () => resolve(secure));
      secure.once("error", reject);
    });
    request.once("error", reject);
    request.end();
  });

const relayKey = (relay: NetworkRelay): string => `${relay.port}\n${relay.credential}`;
const NOT_ON = "it is on the private network, and this node's Private Network is not on";

/**
 * The only owner of the route to a peer (autobyteus-661 AR-003), used by every peer sender. A record paired by plain
 * address is reached directly at its `address`. A record with a `machine` was paired over the private network and is
 * reached only through this node's network relay (the AutoByteus Network program's CONNECT relay): never around it.
 * Without the relay (no Private Network here, or it is not running) such a peer is unavailable, with the reason.
 */
export class PeerConnector {
  private relayed: Readonly<{ key: string; dispatcher: Agent }> | null = null;

  constructor(private readonly dependencies: Readonly<{ networkRelay?(): Promise<NetworkRelay> }> = {}) {}

  async target(route: PeerRoute, routePath: string, options: Readonly<{ webSocket?: boolean }> = {}): Promise<PeerTarget> {
    let target: Readonly<{ url: URL; pathWithQuery: string }>;
    try {
      target = peerRequestTarget(options.webSocket ? route.address.replace(/^http/, "ws") : route.address, routePath);
    } catch {
      return Object.freeze({ kind: "unavailable", detail: `its address ${route.address} is not valid` });
    }
    if (route.machine === null) return Object.freeze({ kind: "direct", ...target, dispatcher: null });
    if (!this.dependencies.networkRelay) return Object.freeze({ kind: "unavailable", detail: NOT_ON });
    let relay: NetworkRelay;
    try {
      relay = await this.dependencies.networkRelay();
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      return Object.freeze({ kind: "unavailable", detail: code === "PRIVATE_NETWORK_NOT_SET_UP" ? NOT_ON
        : `this node's network relay is not available (${error instanceof Error ? error.message : String(error)})` });
    }
    return Object.freeze({ kind: "relayed", ...target, dispatcher: this.dispatcherFor(relay) });
  }

  /** Closes the relay's connections (the server closes). */
  async close(): Promise<void> {
    const relayed = this.relayed;
    this.relayed = null;
    await relayed?.dispatcher.close().catch(() => undefined);
  }

  /** One dispatcher per relay start (port and credential); a new start replaces it and closes the old one's connections. */
  private dispatcherFor(relay: NetworkRelay): Dispatcher {
    const key = relayKey(relay);
    if (this.relayed?.key === key) return this.relayed.dispatcher;
    const previous = this.relayed;
    const dispatcher = new Agent({
      connect: (options, callback) => {
        const tlsWanted = options.protocol === "https:" || options.protocol === "wss:";
        const port = Number(options.port) || (tlsWanted ? 443 : 80);
        openRelayTunnel(relay, { hostname: options.hostname, port, tls: tlsWanted, servername: options.servername ?? undefined })
          .then((socket) => callback(null, socket), (error: Error) => callback(error, null));
      },
    });
    this.relayed = Object.freeze({ key, dispatcher });
    void previous?.dispatcher.close().catch(() => undefined);
    return dispatcher;
  }
}
