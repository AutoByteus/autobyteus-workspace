import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import type { AgentToolsMcpLocalAccessGate } from "../agent-tools/mcp/agent-tools-mcp-local-access.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import { createServerLogger } from "../logging/server-app-logger.js";
import { proxyRouteBase, type DeliveryDefinitions } from "./delivery-definitions.js";
import type { IntegrationAccessRule } from "./integration-access-rule.js";
import type { IntegrationActivityLog } from "./integration-activity-log.js";
import type { IntegrationCatalog } from "./integration-catalog.js";
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
  definitions: DeliveryDefinitions;
  access: Pick<IntegrationAccessRule, "allowsCall">;
  /** The integration's name and skill from its manifest, read only when a refusal is written. */
  catalog: Pick<IntegrationCatalog, "describe">;
  management: () => SecretManagementService;
  forwarder: CredentialProxyForwarder;
  activity: IntegrationActivityLog;
  proxyBaseUrl: () => string;
}>;

/** `/r/<pass>/<integrationId>/<route><path>?<query>`, read from the raw URL so the path stays as the caller sent it. */
const PROXY_URL = /^\/r\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)(.*)$/s;

type RefusalNames = Readonly<{ name: string; skillName: string | null }>;

const messageFor = (code: CredentialProxyErrorCode, { name, skillName }: RefusalNames): string => {
  switch (code) {
    case "NOT_LOOPBACK": return "Only local calls are accepted.";
    case "RUN_PASS_INVALID": return "This address is not valid: its run has ended, or it never had access.";
    case "INTEGRATION_NOT_ALLOWED": return skillName
      ? `This agent has no access to ${name}. Add the ${skillName} skill to the agent.`
      : `This agent has no access to ${name}.`;
    case "INTEGRATION_NOT_CONNECTED": return `${name} is not connected on this node. Connect it on the Integrations page.`;
    case "PATH_NOT_ALLOWED": return `This path is not allowed for ${name}.`;
    case "UPSTREAM_REJECTED_TOKEN": return `${name} rejected the stored token. Check it on the Integrations page.`;
    case "UPSTREAM_UNREACHABLE": return `${name} could not be reached.`;
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
    if (!parsed) return refuse(reply, "PATH_NOT_ALLOWED", { name: "this integration", skillName: null });
    const [, pass, integrationId, routeId, rest] = parsed as unknown as [string, string, string, string, string];
    const rawPathAndQuery = !rest ? "/" : rest.startsWith("?") ? `/${rest}` : rest;
    const recordPath = rawPathAndQuery.split("?")[0] || "/";
    // The manifest's name (the ID when it is no longer imported), read only when a refusal is written.
    const names = (): RefusalNames => {
      const described = deps.catalog.describe(integrationId);
      return { name: described?.name ?? integrationId, skillName: described?.skillName ?? null };
    };
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
      const code = typeof error === "string" ? error : error.code;
      const status = typeof error === "string" ? 403 : error.status;
      await record(status, code);
      return refuse(reply, code, names(), status);
    };

    if (!deps.gate.validateRequest(request).ok) return fail("NOT_LOOPBACK");
    holder = deps.passes.lookup(pass);
    if (!holder) return fail("RUN_PASS_INVALID");
    const definition = deps.definitions.get(integrationId);
    const route = deps.definitions.route(integrationId, routeId);
    if (!definition || !route) return fail("PATH_NOT_ALLOWED");
    const grant = holder.grants.get(integrationId);
    if (!grant || !(await deps.access.allowsCall(holder.agentDefinitionId, grant))) return fail("INTEGRATION_NOT_ALLOWED");
    try {
      buildUpstreamUrl(route, request.method, rawPathAndQuery);
    } catch (error) {
      return fail(error instanceof CredentialProxyError ? error : "PATH_NOT_ALLOWED");
    }

    let token: SecretValue;
    try {
      token = await deps.management().resolveForUse({ kind: "integration", integrationId: definition.id });
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
      if (error instanceof CredentialProxyError) return fail(error);
      logger.error(`Credential proxy call failed (${error instanceof Error ? error.name : "error"}).`);
      await record(500);
      return reply.code(500).type("application/json").send({ error: "PROXY_FAILED", message: "The call failed in the proxy." });
    }
  });
};

const refuse = (reply: FastifyReply, code: CredentialProxyErrorCode, names: RefusalNames, status = 403) =>
  reply.code(status).type("application/json").send({ error: code, message: messageFor(code, names) });
