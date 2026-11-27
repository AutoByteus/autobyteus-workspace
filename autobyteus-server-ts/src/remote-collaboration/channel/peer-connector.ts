/** Where a peer is reached: its record's `address`, and its `machine` when it was paired over the private network. */
export type PeerRoute = Readonly<{ address: string; machine: string | null }>;

/** A request's way to the peer: the URL to call and the path with query it signs (as the receiving node sees it). */
export type PeerTarget =
  | Readonly<{ kind: "direct"; url: URL; pathWithQuery: string }>
  | Readonly<{ kind: "unavailable"; detail: string }>;

/**
 * Where a request to a peer goes and the path it signs (NA-9): the URL is the peer's address plus the node route; the
 * signed path is the node route with its query, as the receiving node sees it. A peer behind a gateway at a base path
 * (`https://gateway.example.com/autobyteus`) receives the route without that base path, so the base path is never
 * signed: one rule on both sides.
 */
export const peerRequestTarget = (address: string, routePath: string): Readonly<{ url: URL; pathWithQuery: string }> => {
  const url = new URL(`${address.replace(/\/+$/, "")}${routePath}`);
  const basePath = new URL(address).pathname.replace(/\/+$/, "");
  const nodePath = basePath && url.pathname.startsWith(`${basePath}/`) ? url.pathname.slice(basePath.length) : url.pathname;
  return Object.freeze({ url, pathWithQuery: `${nodePath}${url.search}` });
};

/**
 * The only owner of the route to a peer (autobyteus-661 AR-003), used by every peer sender. A record paired by plain
 * address is reached directly at its `address`. A record with a `machine` was paired over the private network and is
 * reached only through this node's network relay (the CONNECT tunnel of the AutoByteus Network program, T-4); until
 * that relay is there, such a peer is unavailable, never reached around it.
 */
export class PeerConnector {
  target(route: PeerRoute, routePath: string, options: Readonly<{ webSocket?: boolean }> = {}): PeerTarget {
    if (route.machine !== null) {
      return Object.freeze({ kind: "unavailable", detail: "it is on the private network, and this node's Private Network is not on" });
    }
    let target: Readonly<{ url: URL; pathWithQuery: string }>;
    try {
      target = peerRequestTarget(options.webSocket ? route.address.replace(/^http/, "ws") : route.address, routePath);
    } catch {
      return Object.freeze({ kind: "unavailable", detail: `its address ${route.address} is not valid` });
    }
    return Object.freeze({ kind: "direct", ...target });
  }
}
