import type { FastifyRequest } from "fastify";
import type { ClientIdentity } from "../../node-access/domain/client-identity.js";
import type { ClientRevocationSource } from "../../node-access/domain/credential-verification.js";
import type { NetworkAdmissionCheck } from "../../node-access/domain/network-admission-facts.js";
import { NODE_ACCESS_REFUSALS, type NodeAccessRefusal } from "../../node-access/domain/node-access-refusal.js";
import type { NodeCredentialResolver } from "../../node-access/services/node-credential-resolver.js";
import { routeAccessFor } from "./node-route-permissions.js";
import type { ClosableSocket, OpenSocketRegistry } from "./open-socket-registry.js";

/** The browser WebSocket credential's query key (the phone; browsers cannot set headers on a WebSocket). */
export const WEBSOCKET_ACCESS_TOKEN_QUERY_KEY = "access_token";

export type GateDecision =
  /** `identity` is `null` on an exempt endpoint and on a tool endpoint (its own token decides). */
  | Readonly<{ ok: true; identity: ClientIdentity | null }>
  | Readonly<{ ok: false; refusal: NodeAccessRefusal }>;

const isWebSocketUpgrade = (request: FastifyRequest): boolean =>
  String(request.headers.upgrade ?? "").toLowerCase() === "websocket";

const pathOf = (url: string): string => url.split("?", 1)[0] || "/";

const readWebSocketQueryCredential = (request: FastifyRequest): string | null => {
  const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?") + 1) : "";
  return new URLSearchParams(query).get(WEBSOCKET_ACCESS_TOKEN_QUERY_KEY)?.trim() || null;
};

/**
 * The node's request gate after its Host and Origin rules (node access model §2, design DS-001): network admission,
 * then the client identity from the request's one credential, then the route permission for that kind of client.
 * The only place that decides whether a request may run; handlers read the identity it sets.
 */
export class NodeAccessGate {
  constructor(
    private readonly admission: NetworkAdmissionCheck,
    private readonly resolver: NodeCredentialResolver,
    readonly openSockets: OpenSocketRegistry,
    revocationSources: readonly ClientRevocationSource[],
  ) {
    revocationSources.forEach((source) => source.onClientRevoked((revocation) => openSockets.close(revocation)));
  }

  async decide(request: FastifyRequest): Promise<GateDecision> {
    const socket = request.raw.socket;
    if (!(await this.admission.admits({ clientAddress: socket?.remoteAddress, localAddress: socket?.localAddress }))) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.networkRefused };
    }

    const upgrade = isWebSocketUpgrade(request);
    const access = routeAccessFor({
      method: request.method,
      route: request.routeOptions.url ?? pathOf(request.url),
      isWebSocketUpgrade: upgrade,
    });
    if (access.kind !== "clients") {
      return { ok: true, identity: null };
    }

    const verification = await this.resolver.identify({
      method: request.method,
      pathWithQuery: request.url,
      headers: request.headers,
      webSocketQueryCredential: upgrade ? readWebSocketQueryCredential(request) : null,
    });
    if (!verification.ok) {
      return verification;
    }
    const { identity } = verification;
    if (!access.permitted.has(identity.kind)) {
      const refusal = upgrade && identity.kind === "phone"
        ? NODE_ACCESS_REFUSALS.phoneRouteRefused
        : NODE_ACCESS_REFUSALS.routeNotPermitted;
      return { ok: false, refusal };
    }
    return { ok: true, identity };
  }
}

type AdmittedRequest = Readonly<{ identity: ClientIdentity; openSockets: OpenSocketRegistry }>;

const admittedRequests = new WeakMap<object, AdmittedRequest>();
const webSocketRefusals = new WeakMap<object, NodeAccessRefusal>();

/** Records the identity the gate established for the request, and where its sockets register. */
export const admitRequest = (request: FastifyRequest, identity: ClientIdentity, openSockets: OpenSocketRegistry): void => {
  admittedRequests.set(request.raw, Object.freeze({ identity, openSockets }));
};

/** The client identity the gate established for this request; `null` on an exempt or tool endpoint. */
export const getClientIdentity = (request: FastifyRequest): ClientIdentity | null =>
  admittedRequests.get(request.raw)?.identity ?? null;

/**
 * Registers a socket accepted on this upgrade request under its client identity, so a revocation closes it (NA-11);
 * the returned function removes it. Used by the gated `/ws/*` wrapper, GraphQL subscriptions and the peer
 * run-observation socket.
 */
export const registerOpenSocket = (request: FastifyRequest, socket: ClosableSocket): (() => void) => {
  const admitted = admittedRequests.get(request.raw);
  return admitted ? admitted.openSockets.register(admitted.identity, socket) : () => undefined;
};

/** A refused upgrade of a gated `/ws/*` route, which its WebSocket wrapper closes with the close code (design M-3). */
export const getWebSocketRefusal = (request: FastifyRequest): NodeAccessRefusal | null => webSocketRefusals.get(request.raw) ?? null;

export const setWebSocketRefusal = (request: FastifyRequest, refusal: NodeAccessRefusal): void => {
  webSocketRefusals.set(request.raw, refusal);
};
