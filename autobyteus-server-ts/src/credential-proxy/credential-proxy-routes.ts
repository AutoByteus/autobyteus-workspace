import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import type { AgentToolsMcpLocalAccessGate } from "../agent-tools/mcp/agent-tools-mcp-local-access.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import type { IntegrationId } from "../secret-management/domain/secret-id.js";
import { createServerLogger } from "../logging/server-app-logger.js";
import type { IntegrationConnectionStore } from "./integration-connection-store.js";
import { proxyRouteBase, type IntegrationDefinitions } from "./integration-definitions.js";
import type { IntegrationActivityLog } from "./integration-activity-log.js";
import type { RunPassHolder, RunPassRegistry } from "./run-pass-registry.js";
import {
  buildUpstreamUrl,
  CredentialProxyError,
  type CredentialProxyErrorCode,
  type CredentialProxyForwarder,
} from "./credential-proxy-forwarder.js";

const logger = createServerLogger("credential-proxy");

export type CredentialProxyRouteDependencies = Readonly<{
  gate: AgentToolsMcpLocalAccessGate;
  passes: RunPassRegistry;
  store: IntegrationConnectionStore;
  definitions: IntegrationDefinitions;
  management: () => SecretManagementService;
  forwarder: CredentialProxyForwarder;
  activity: IntegrationActivityLog;
  proxyBaseUrl: () => string;
}>;

/** `/r/<pass>/<integrationId>/<route><path>?<query>`, read from the raw URL so the path stays as the caller sent it. */
const PROXY_URL = /^\/r\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)(.*)$/s;

const messageFor = (code: CredentialProxyErrorCode, displayName: string): string => {
  switch (code) {
    case "NOT_LOOPBACK": return "Only local calls are accepted.";
    case "RUN_PASS_INVALID": return "This address is not valid: its run has ended, or it never had access.";
    case "INTEGRATION_NOT_ALLOWED": return `This agent has no ${displayName} access. Allow it on the ${displayName} card in Settings.`;
    case "INTEGRATION_NOT_CONNECTED": return `${displayName} is not connected on this node. Connect it in Settings.`;
    case "PATH_NOT_ALLOWED": return `This path is not allowed for ${displayName}.`;
    case "UPSTREAM_REJECTED_TOKEN": return `${displayName} rejected the stored token. Check it on the ${displayName} card in Settings.`;
    case "UPSTREAM_UNREACHABLE": return `${displayName} could not be reached.`;
  }
};

/**
 * The credential proxy's one route (DS-003). Every refusal happens before any upstream call and is recorded too. The
 * request body is left unread (no content parser) so it can be streamed upstream.
 */
export const registerCredentialProxyRoutes = async (
  app: FastifyInstance,
  deps: CredentialProxyRouteDependencies,
): Promise<void> => {
  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", (_request, _payload, done) => done(null, undefined));

  app.all("/r/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const startedAt = Date.now();
    const parsed = PROXY_URL.exec(request.raw.url ?? "");
    if (!parsed) return refuse(reply, "PATH_NOT_ALLOWED", "This integration");
    const [, pass, integrationId, routeId, rest] = parsed as unknown as [string, string, string, string, string];
    const rawPathAndQuery = !rest ? "/" : rest.startsWith("?") ? `/${rest}` : rest;
    const recordPath = rawPathAndQuery.split("?")[0] || "/";
    const displayName = deps.definitions.get(integrationId)?.displayName ?? integrationId;
    let holder: RunPassHolder | null = null;

    const record = (status: number, error?: CredentialProxyErrorCode): Promise<void> => deps.activity.append({
      at: new Date(startedAt).toISOString(),
      runId: holder?.runId ?? null,
      agentDefinitionId: holder?.agentDefinitionId ?? null,
      integrationId,
      route: routeId,
      method: request.method,
      path: recordPath,
      status,
      ...(error ? { error } : {}),
      durationMs: Date.now() - startedAt,
    });
    const fail = async (error: CredentialProxyError | CredentialProxyErrorCode) => {
      const failure = typeof error === "string" ? new CredentialProxyError(error, messageFor(error, displayName)) : error;
      await record(failure.status, failure.code);
      return refuse(reply, failure.code, displayName, failure.status);
    };

    if (!deps.gate.validateRequest(request).ok) return fail("NOT_LOOPBACK");
    holder = deps.passes.lookup(pass);
    if (!holder) return fail("RUN_PASS_INVALID");
    const route = deps.definitions.route(integrationId, routeId);
    if (!route) return fail("PATH_NOT_ALLOWED");
    if (!deps.store.isAllowed(holder.agentDefinitionId, integrationId as IntegrationId)) return fail("INTEGRATION_NOT_ALLOWED");
    try {
      buildUpstreamUrl(route, request.method, rawPathAndQuery);
    } catch (error) {
      return fail(error instanceof CredentialProxyError ? error : "PATH_NOT_ALLOWED");
    }

    let token: SecretValue;
    try {
      token = await deps.management().resolveForUse({ kind: "integration", integrationId: integrationId as IntegrationId });
    } catch {
      return fail("INTEGRATION_NOT_CONNECTED");
    }

    try {
      const response = await deps.forwarder.forward({
        route,
        token,
        request: { method: request.method, rawPathAndQuery, headers: request.headers, body: request.raw },
        proxyRouteBase: proxyRouteBase(deps.proxyBaseUrl(), pass, integrationId, routeId),
      });
      await record(response.status);
      return reply.code(response.status).headers(response.headers).send(response.body ?? "");
    } catch (error) {
      if (error instanceof CredentialProxyError) {
        return fail(new CredentialProxyError(error.code, messageFor(error.code, displayName), error.status));
      }
      logger.error(`Credential proxy call failed (${error instanceof Error ? error.name : "error"}).`);
      await record(500);
      return reply.code(500).type("application/json").send({ error: "PROXY_FAILED", message: "The call failed in the proxy." });
    }
  });
};

const refuse = (reply: FastifyReply, code: CredentialProxyErrorCode, displayName: string, status = 403) =>
  reply.code(status).type("application/json").send({ error: code, message: messageFor(code, displayName) });
