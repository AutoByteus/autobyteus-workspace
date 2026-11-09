import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { PEER_BODY_SHA256_HEADER } from "../../node-access/domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { getNodeBrowserAccess } from "./node-browser-access.js";
import { admitRequest, getClientIdentity, setWebSocketRefusal, type NodeAccessGate } from "./node-access-gate.js";
import { logRequestRefusal, refuseRequest, toLoggableRequestValue, type RequestRefusal } from "./request-refusal.js";
import { createRequestOriginPolicy } from "./remote-access-request-origin.js";

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const EMPTY_BODY_SHA256 = createHash("sha256").update("").digest("hex");

/** The SHA-256 of each peer request's body as it was read (design M-7). */
const peerBodyHashes = new WeakMap<object, string>();

const ORIGIN_REFUSED: RequestRefusal = {
  statusCode: 403,
  code: "REMOTE_ACCESS_ORIGIN_REFUSED",
  message: "Requests from this origin are not accepted by this node.",
};

declare module "fastify" {
  interface FastifyContextConfig {
    /** Set by `registerGatedWebSocketRoute` on every `/ws/*` route it registers (design M-3). */
    gatedWebSocket?: true;
  }
}

/**
 * The node's origin and access hook: every HTTP request and WebSocket upgrade that passed the Host rule meets the
 * allowed-origin rule, then the node access gate (admission, credential, route permission). A refusal is answered
 * with its HTTP status before any handler runs; only an upgrade of a gated `/ws/*` route is accepted so its wrapper
 * closes it with the close code. For a peer, the received body must be the one its signature covers: hashed as it is
 * read, compared before any handler runs (NA-9, design M-7). CORS grants follow the origin rule. Register after
 * `registerMcpGatewayRoutes`, whose tool-endpoint origin rule and token for `/mcp/gateway` run first.
 */
export async function registerNodeAccessPlugin(app: FastifyInstance, gate: NodeAccessGate): Promise<void> {
  const originPolicy = createRequestOriginPolicy(getNodeBrowserAccess().allowedOrigins);

  // Callback form: @fastify/cors fails every request for a one-argument synchronous delegator.
  // `origin: true` reflects the request's Origin, and grants nothing to a request without one.
  await app.register(cors, {
    delegator: (request, callback) => {
      callback(null, { origin: originPolicy.isAllowed(request.headers), methods: CORS_METHODS });
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!originPolicy.isAllowed(request.headers)) {
      const origin = toLoggableRequestValue(String(request.headers.origin));
      return refuseRequest(request, reply, ORIGIN_REFUSED, `origin ${origin}`);
    }

    const decision = await gate.decide(request);
    if (decision.ok) {
      if (decision.identity) admitRequest(request, decision.identity, gate.openSockets);
      return;
    }
    if (request.routeOptions.config?.gatedWebSocket === true && String(request.headers.upgrade ?? "").toLowerCase() === "websocket") {
      logRequestRefusal(request, decision.refusal);
      setWebSocketRefusal(request, decision.refusal);
      return;
    }
    return refuseRequest(request, reply, decision.refusal);
  });

  app.addHook("preParsing", async (request, _reply, payload) => {
    if (getClientIdentity(request)?.kind !== "peer") return payload;
    const hash = createHash("sha256");
    const hashing = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        callback(null, chunk);
      },
      flush(callback) {
        peerBodyHashes.set(request.raw, hash.digest("hex"));
        callback();
      },
    });
    payload.on("error", (error) => hashing.destroy(error));
    return payload.pipe(hashing);
  });

  app.addHook("preValidation", async (request, reply) => {
    if (getClientIdentity(request)?.kind !== "peer") return;
    const received = peerBodyHashes.get(request.raw) ?? EMPTY_BODY_SHA256;
    if (request.headers[PEER_BODY_SHA256_HEADER] !== received) {
      return refuseRequest(request, reply, NODE_ACCESS_REFUSALS.credentialInvalid, "body does not match its signature");
    }
  });
}
