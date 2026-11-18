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
import {
  providerRelayBaseUrl,
  providerRelayKeyMissingText,
  type ProviderRelay,
  type ProviderRelays,
} from "./provider-relays.js";

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
  /** The activity clock (tests); defaults to `Date.now`. */
  now?: () => number;
}>;

export type ProviderRelayRefusalCode =
  | "NOT_LOOPBACK"
  | "RUN_PASS_INVALID"
  | "RELAY_NOT_ALLOWED"
  | "PATH_NOT_ALLOWED"
  | "RELAY_KEY_NOT_SET"
  | "UPSTREAM_UNREACHABLE"
  | "PROXY_FAILED";

/** `/relay/<relayId><path>?<query>`, read from the raw URL so the path stays as the caller sent it. */
const RELAY_URL = /^\/relay\/([^/?#]+)(.*)$/s;

/**
 * Refusals in the Anthropic Messages error envelope, the only failure shape the runtime shows the text of; the status
 * and type decide whether it retries (`authentication_error`/`permission_error`: never).
 */
const REFUSALS: Readonly<Record<ProviderRelayRefusalCode, Readonly<{ status: number; type: string }>>> = {
  NOT_LOOPBACK: { status: 403, type: "permission_error" },
  RUN_PASS_INVALID: { status: 401, type: "authentication_error" },
  RELAY_NOT_ALLOWED: { status: 403, type: "permission_error" },
  PATH_NOT_ALLOWED: { status: 404, type: "not_found_error" },
  RELAY_KEY_NOT_SET: { status: 403, type: "permission_error" },
  UPSTREAM_UNREACHABLE: { status: 502, type: "api_error" },
  PROXY_FAILED: { status: 500, type: "api_error" },
};

const messageFor = (code: ProviderRelayRefusalCode, relay: ProviderRelay | null): string => {
  const name = relay ? `the ${relay.providerName} relay` : "this relay";
  switch (code) {
    case "NOT_LOOPBACK": return "Only local calls are accepted.";
    case "RUN_PASS_INVALID": return "The run pass is not valid: its run has ended, or it never had access.";
    case "RELAY_NOT_ALLOWED": return `This run has no access to ${name}.`;
    case "PATH_NOT_ALLOWED": return `This path is not allowed for ${name}.`;
    case "RELAY_KEY_NOT_SET": return relay ? providerRelayKeyMissingText(relay) : "The API key is not set in AutoByteus.";
    case "UPSTREAM_UNREACHABLE": return `${relay?.providerName ?? "The provider"} could not be reached.`;
    case "PROXY_FAILED": return "The call failed in the proxy.";
  }
};

const refuse = (reply: FastifyReply, code: ProviderRelayRefusalCode, relay: ProviderRelay | null) => {
  const { status, type } = REFUSALS[code];
  return reply.code(status).type("application/json")
    .send({ type: "error", error: { type, code, message: messageFor(code, relay) } });
};

const headerValue = (value: string | string[] | undefined): string | null =>
  typeof value === "string" && value ? value : null;

/**
 * The provider relays' route family (`/relay/<relayId>/…`, the run pass in `x-api-key`). Every refusal happens before
 * any upstream call. The request and the reply pass unchanged apart from the key swap; the reply's stream is read as
 * it passes so each call is reported to the run's observers: started, throttled activity, and finished (with the
 * provider's usage) synchronously when the upstream reply ends. Logs no pass and no header value.
 */
export const registerProviderRelayRoutes = async (
  app: FastifyInstance,
  deps: ProviderRelayRouteDependencies,
): Promise<void> => {
  const now = deps.now ?? Date.now;
  await app.register(async (scope) => {
    // Bodies stay unread so they stream upstream unchanged.
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser("*", (_request, _payload, done) => done(null, undefined));

    scope.all("/relay/*", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!deps.gate.validateRequest(request).ok) return refuse(reply, "NOT_LOOPBACK", null);
      const parsed = RELAY_URL.exec(request.raw.url ?? "");
      const relay = parsed ? deps.relays.get(parsed[1]!) : null;
      if (!parsed || !relay) return refuse(reply, "PATH_NOT_ALLOWED", null);
      const rest = parsed[2] ?? "";
      const rawPathAndQuery = !rest ? "/" : rest.startsWith("?") ? `/${rest}` : rest;
      const pass = headerValue(request.headers["x-api-key"]);
      const holder = pass ? deps.passes.lookup(pass) : null;
      if (!holder) return refuse(reply, "RUN_PASS_INVALID", relay);
      if (holder.providerRelayId !== relay.id) return refuse(reply, "RELAY_NOT_ALLOWED", relay);
      try {
        buildUpstreamUrl(relay.route, request.method, rawPathAndQuery);
      } catch {
        return refuse(reply, "PATH_NOT_ALLOWED", relay);
      }
      let key: SecretValue;
      try {
        key = await deps.management().resolveForUse(relay.consumer);
      } catch {
        return refuse(reply, "RELAY_KEY_NOT_SET", relay);
      }

      const callId = randomUUID();
      const purpose: ProviderCallPurpose = request.headers[relay.compactionHeader] === "1" ? "compaction" : "turn";
      const report = (observation: ProviderCallObservation) => deps.observers.notify(holder.runId, observation);
      report({ kind: "started", callId, purpose });
      let response: ForwardResponse;
      try {
        response = await deps.forwarder.forward({
          route: relay.route,
          token: key,
          request: { method: request.method, rawPathAndQuery, headers: request.headers, body: request.raw },
          proxyRouteBase: providerRelayBaseUrl(deps.proxyBaseUrl(), relay.id),
        });
      } catch (error) {
        report({ kind: "finished", callId, purpose, httpStatus: 502, usage: null, stopReason: null });
        if (error instanceof CredentialProxyError && error.code === "UPSTREAM_UNREACHABLE") {
          return refuse(reply, "UPSTREAM_UNREACHABLE", relay);
        }
        logger.error(`Provider relay call failed (${error instanceof Error ? error.name : "error"}).`);
        return refuse(reply, "PROXY_FAILED", relay);
      }
      const body = tapReply(response, {
        activity: () => report({ kind: "activity", callId }),
        finished: (reader) => report({
          kind: "finished", callId, purpose, httpStatus: response.status,
          usage: reader.usage(), stopReason: reader.stopReason(),
        }),
        now,
      });
      return reply.code(response.status).headers(response.headers).send(body ?? "");
    });
  });
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
