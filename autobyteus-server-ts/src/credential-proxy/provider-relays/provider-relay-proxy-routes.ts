import { randomUUID } from "node:crypto";
import { Readable, Transform, pipeline } from "node:stream";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AgentToolsMcpLocalAccessGate } from "../../agent-tools/mcp/agent-tools-mcp-local-access.js";
import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { createServerLogger } from "../../logging/server-app-logger.js";
import {
  buildUpstreamUrl,
  CredentialProxyError,
  type CredentialProxyForwarder,
  type ForwardResponse,
} from "../credential-proxy-forwarder.js";
import type { RunPassRegistry } from "../run-pass-registry.js";
import { AnthropicMessagesStreamReader } from "./anthropic-messages-stream-reader.js";
import type { ProviderCallObservation, ProviderCallPurpose } from "./provider-call-observation.js";
import type { ProviderCallObservers } from "./provider-relay-access.js";
import type { ProviderRelayPeerForwarder, RelayedCallResult } from "./provider-relay-peer-forwarder.js";
import {
  providerRelayRefusal,
  providerRelayRefusalText,
  type ProviderRelayRefusal,
} from "./provider-relay-refusals.js";
import { providerRelayBaseUrl, type ProviderRelay, type ProviderRelays } from "./provider-relays.js";

const logger = createServerLogger("credential-proxy");

/** At most one activity report per call per second. */
const ACTIVITY_INTERVAL_MS = 1_000;

export type ProviderRelayRouteDependencies = Readonly<{
  gate: AgentToolsMcpLocalAccessGate;
  passes: Pick<RunPassRegistry, "lookup">;
  relays: ProviderRelays;
  observers: ProviderCallObservers;
  management: () => SecretManagementService;
  forwarder: CredentialProxyForwarder;
  proxyBaseUrl: () => string;
  /** Set exactly on a relayed node (C1): every call goes to the relay node, never to the provider. */
  peerForwarder: ProviderRelayPeerForwarder | null;
  /** The activity clock (tests); defaults to `Date.now`. */
  now?: () => number;
}>;

/** `/relay/<relayId><path>?<query>`, read from the raw URL so the path stays as the caller sent it. */
const RELAY_URL = /^\/relay\/([^/?#]+)(.*)$/s;

const send = (reply: FastifyReply, refusal: ProviderRelayRefusal) =>
  reply.code(refusal.status).type("application/json").send(refusal.body);

const headerValue = (value: string | string[] | undefined): string | null =>
  typeof value === "string" && value ? value : null;

/**
 * The pass a runtime sent, in its provider's own credential header: `x-api-key` (Anthropic clients, DeepSeek
 * Harness), `Authorization: Bearer` (OpenAI-style clients, Codex, Grok, Claude with a login token) or
 * `x-goog-api-key` (Gemini). The pass only identifies the run; which header it came in does not matter.
 */
const passOf = (request: FastifyRequest): string | null => {
  const bearer = /^Bearer\s+(\S+)$/i.exec(headerValue(request.headers.authorization) ?? "")?.[1] ?? null;
  return headerValue(request.headers["x-api-key"]) ?? bearer ?? headerValue(request.headers["x-goog-api-key"]);
};

/**
 * The provider relays' route family (`/relay/<relayId>/…`, the pass in the runtime's credential header). Every
 * refusal happens before any upstream call. Unrelayed, the node's own vault key is attached; relayed, the call goes to
 * the relay node (`ProviderRelayPeerForwarder`), which attaches the credential of the kind the pass was granted. The
 * request and the reply pass unchanged apart from the credential; a relay with a stream reader reports each run call
 * to the run's observers: started, throttled activity, and finished (with the provider's usage) synchronously when
 * the reply ends. Logs no pass and no header value.
 */
export const registerProviderRelayRoutes = async (
  app: FastifyInstance,
  deps: ProviderRelayRouteDependencies,
): Promise<void> => {
  const now = deps.now ?? Date.now;
  await app.register(async (scope) => {
    // Bodies stay unread so they stream upstream unchanged (the relayed side reads them whole to sign them).
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser("*", (_request, _payload, done) => done(null, undefined));

    scope.all("/relay/*", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!deps.gate.validateRequest(request).ok) return send(reply, providerRelayRefusal("NOT_LOOPBACK", providerRelayRefusalText.notLoopback()));
      const parsed = RELAY_URL.exec(request.raw.url ?? "");
      const relay = parsed ? deps.relays.get(parsed[1]!) : null;
      if (!parsed || !relay) return send(reply, providerRelayRefusal("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(null)));
      const rest = parsed[2] ?? "";
      const rawPathAndQuery = !rest ? "/" : rest.startsWith("?") ? `/${rest}` : rest;
      const pass = passOf(request);
      const holder = pass ? deps.passes.lookup(pass) : null;
      if (!holder) return send(reply, providerRelayRefusal("RUN_PASS_INVALID", providerRelayRefusalText.passInvalid()));
      const kind = holder.providerRelays.get(relay.id);
      if (!kind) return send(reply, providerRelayRefusal("RELAY_NOT_ALLOWED", providerRelayRefusalText.notAllowed(relay)));
      const route = relay.routes[kind];
      if (!route) return send(reply, providerRelayRefusal("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(relay)));
      try {
        buildUpstreamUrl(route.route, request.method, rawPathAndQuery);
      } catch {
        return send(reply, providerRelayRefusal("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(relay)));
      }

      const callId = randomUUID();
      const purpose: ProviderCallPurpose = relay.observation.compactionHeader
        && request.headers[relay.observation.compactionHeader] === "1" ? "compaction" : "turn";
      const observed = relay.observation.streamReader !== null && holder.kind === "run";
      const report = (observation: ProviderCallObservation) => {
        if (observed && holder.kind === "run") deps.observers.notify(holder.runId, observation);
      };
      const finishedWithoutReply = (status: number) =>
        report({ kind: "finished", callId, purpose, httpStatus: status, usage: null, stopReason: null });

      let response: ForwardResponse;
      if (deps.peerForwarder) {
        report({ kind: "started", callId, purpose });
        let relayed: RelayedCallResult;
        try {
          relayed = await deps.peerForwarder.forward({
            relayId: relay.id, relayCredentialKind: kind, method: request.method, rawPathAndQuery,
            headers: request.headers, body: ["GET", "HEAD"].includes(request.method) ? null : request.raw,
          });
        } catch (error) {
          finishedWithoutReply(500);
          logger.error(`Relayed provider call failed (${error instanceof Error ? error.name : "error"}).`);
          return send(reply, providerRelayRefusal("PROXY_FAILED", providerRelayRefusalText.proxyFailed()));
        }
        if (relayed.kind === "refused") {
          finishedWithoutReply(relayed.refusal.status);
          return send(reply, relayed.refusal);
        }
        response = relayed.response;
      } else {
        const unrelayed = await forwardWithVaultKey(deps, relay, request, rawPathAndQuery, () => report({ kind: "started", callId, purpose }));
        if ("refusal" in unrelayed) {
          finishedWithoutReply(unrelayed.refusal.status);
          return send(reply, unrelayed.refusal);
        }
        response = unrelayed.response;
      }
      const body = observed
        ? tapReply(response, {
          activity: () => report({ kind: "activity", callId }),
          finished: (reader) => report({
            kind: "finished", callId, purpose, httpStatus: response.status,
            usage: reader.usage(), stopReason: reader.stopReason(),
          }),
          now,
        })
        : response.body;
      return reply.code(response.status).headers(response.headers).send(body ?? "");
    });
  });
};

/** An unrelayed node's call: its own vault key for the relay's API-key route (no other kind is granted there). */
const forwardWithVaultKey = async (
  deps: ProviderRelayRouteDependencies,
  relay: ProviderRelay,
  request: FastifyRequest,
  rawPathAndQuery: string,
  started: () => void,
): Promise<Readonly<{ response: ForwardResponse }> | Readonly<{ refusal: ProviderRelayRefusal }>> => {
  const route = relay.routes.apiKey;
  let key: SecretValue;
  try {
    if (route.source.kind !== "vault") throw new Error("not a vault credential");
    key = await deps.management().resolveForUse(route.source.consumer);
  } catch {
    return { refusal: providerRelayRefusal("RELAY_KEY_NOT_SET", providerRelayRefusalText.keyMissing(relay)) };
  }
  started();
  try {
    const secret = key.revealToTrustedConsumer();
    const response = await deps.forwarder.forward({
      route: route.route,
      credential: Object.freeze({ headers: route.attach({ secret }), secrets: Object.freeze([secret]) }),
      request: { method: request.method, rawPathAndQuery, headers: request.headers, body: request.raw },
      proxyRouteBase: providerRelayBaseUrl(deps.proxyBaseUrl(), relay.id),
    });
    return { response };
  } catch (error) {
    if (error instanceof CredentialProxyError && error.code === "UPSTREAM_UNREACHABLE") {
      return { refusal: providerRelayRefusal("UPSTREAM_UNREACHABLE", providerRelayRefusalText.upstreamUnreachable(relay)) };
    }
    logger.error(`Provider relay call failed (${error instanceof Error ? error.name : "error"}).`);
    return { refusal: providerRelayRefusal("PROXY_FAILED", providerRelayRefusalText.proxyFailed()) };
  }
};

/**
 * The reply body with the stream reader on its way: each chunk is read, at most one activity report per second, and
 * `finished` when the upstream body ends (or the caller stops reading), exactly once.
 */
const tapReply = (
  response: ForwardResponse,
  on: Readonly<{ activity: () => void; finished: (reader: AnthropicMessagesStreamReader) => void; now: () => number }>,
): Buffer | Readable | null => {
  const reader = new AnthropicMessagesStreamReader();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    on.finished(reader);
  };
  if (!(response.body instanceof Readable)) {
    if (response.body) reader.push(response.body);
    finish();
    return response.body;
  }
  let lastActivityAt: number | null = null;
  const tap = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      reader.push(chunk);
      const at = on.now();
      if (lastActivityAt === null || at - lastActivityAt >= ACTIVITY_INTERVAL_MS) {
        lastActivityAt = at;
        on.activity();
      }
      done(null, chunk);
    },
    flush(done) {
      finish();
      done();
    },
  });
  tap.once("close", finish);
  pipeline(response.body, tap, () => undefined);
  return tap;
};
