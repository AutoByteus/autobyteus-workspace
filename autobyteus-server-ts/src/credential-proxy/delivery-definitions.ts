import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import type { IntegrationId } from "../secret-management/domain/secret-id.js";

/** How a route adds the credential to an upstream request (`x-api-key`: the key alone in that header). */
export type DeliveryAuthFormat = "bearer" | "basic-x-access-token" | "x-api-key";

/**
 * One forwarding target of an integration or a provider relay (a route), with its own auth format and allowed paths. The upstream
 * origin is a field, so where the proxy forwards to can become configurable later.
 */
export type DeliveryRoute = Readonly<{
  id: string;
  origin: string;
  /** Prefix added before the caller's path (empty for both GitHub routes). */
  basePath: string;
  auth: DeliveryAuthFormat;
  /** Whether the request body is buffered (sent with its length) or streamed (git packs can be large). */
  buffersRequestBody: boolean;
  /** Whether a text or JSON response body is buffered so an echo of the token can be redacted. */
  redactsTextBodies: boolean;
  /** Whether an upstream `401` becomes `403 UPSTREAM_REJECTED_TOKEN` (git would otherwise prompt for a password). */
  mapsUnauthorizedToForbidden: boolean;
  allows(method: string, pathname: string): boolean;
}>;

/** What a token check with the service answered. */
export type TokenCheck =
  | Readonly<{ status: "accepted"; login: string }>
  | Readonly<{ status: "rejected" }>
  | Readonly<{ status: "unchecked" }>;

/**
 * The app-owned part of one integration (DEC-001): where its token may go (routes, upstream addresses, auth formats),
 * the shell variables a run gets, and how a token is checked. Never read from an imported source, so an integration
 * repository can't send a token anywhere new. Name, description and help text come from the integration's manifest.
 */
export type DeliveryDefinition = Readonly<{
  id: IntegrationId;
  routes: Readonly<Record<string, DeliveryRoute>>;
  /**
   * The variables a run's shell gets for this integration. `env` is the environment so far (the run's base
   * environment plus earlier integrations' variables): git config is appended after its `GIT_CONFIG_COUNT` entries.
   */
  shellVariables(proxyBaseUrl: string, pass: string, env: Readonly<Record<string, string | undefined>>): Record<string, string>;
  /** Checks a token with the service before it is stored; never logs or returns it. */
  verifyToken(token: SecretValue, fetchImpl: typeof fetch): Promise<TokenCheck>;
}>;

const API_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const GIT_PATH = /^\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(?:\.git)?\/(info\/refs|git-upload-pack|git-receive-pack)$/;

/** The address prefix of one route of one integration for one run pass (no trailing slash). */
export const proxyRouteBase = (proxyBaseUrl: string, pass: string, integrationId: string, routeId: string): string =>
  `${proxyBaseUrl}/r/${pass}/${integrationId}/${routeId}`;

const existingGitConfigCount = (env: Readonly<Record<string, string | undefined>>): number => {
  const count = Number.parseInt(env.GIT_CONFIG_COUNT ?? "", 10);
  return Number.isInteger(count) && count > 0 ? count : 0;
};

export type GitHubDeliveryOrigins = Readonly<{ apiOrigin: string; gitOrigin: string }>;

/** GitHub: the REST/GraphQL API (`Bearer`) and git smart-HTTP (`Basic x-access-token:<token>`). */
export const createGitHubDeliveryDefinition = (
  origins: GitHubDeliveryOrigins = { apiOrigin: "https://api.github.com", gitOrigin: "https://github.com" },
): DeliveryDefinition => Object.freeze({
  id: "github",
  routes: Object.freeze({
    api: Object.freeze({
      id: "api",
      origin: origins.apiOrigin,
      basePath: "",
      auth: "bearer",
      buffersRequestBody: true,
      redactsTextBodies: true,
      mapsUnauthorizedToForbidden: false,
      allows: (method: string, pathname: string) => API_METHODS.has(method) && pathname.startsWith("/"),
    }),
    git: Object.freeze({
      id: "git",
      origin: origins.gitOrigin,
      basePath: "",
      auth: "basic-x-access-token",
      buffersRequestBody: false,
      redactsTextBodies: false,
      mapsUnauthorizedToForbidden: true,
      allows: (method: string, pathname: string) => {
        const endpoint = GIT_PATH.exec(pathname)?.[1];
        if (!endpoint) return false;
        return endpoint === "info/refs" ? method === "GET" : method === "POST";
      },
    }),
  }),
  shellVariables: (proxyBaseUrl, pass, env) => {
    const n = existingGitConfigCount(env);
    return {
      AUTOBYTEUS_GITHUB_API_URL: proxyRouteBase(proxyBaseUrl, pass, "github", "api"),
      GIT_CONFIG_COUNT: String(n + 1),
      [`GIT_CONFIG_KEY_${n}`]: `url.${proxyRouteBase(proxyBaseUrl, pass, "github", "git")}/.insteadOf`,
      [`GIT_CONFIG_VALUE_${n}`]: `${origins.gitOrigin}/`,
      // A second guard: git in an agent's shell must never wait for a password the agent can't type.
      GIT_TERMINAL_PROMPT: "0",
    };
  },
  // `GET /user` with `Bearer`: the login on success, 401 when GitHub rejects the token.
  verifyToken: async (token, fetchImpl) => {
    let response: Response;
    try {
      response = await fetchImpl(new URL("/user", origins.apiOrigin), {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token.revealToTrustedConsumer()}`,
          "user-agent": "AutoByteus",
        },
        redirect: "manual",
      });
    } catch {
      return { status: "unchecked" };
    }
    if (response.status === 401) return { status: "rejected" };
    if (!response.ok) return { status: "unchecked" };
    const login = ((await response.json().catch(() => null)) as { login?: unknown } | null)?.login;
    return typeof login === "string" && login ? { status: "accepted", login } : { status: "unchecked" };
  },
});

/** The integrations this app can deliver a credential for. Jira is added later as one more definition. */
export class DeliveryDefinitions {
  private readonly byId: ReadonlyMap<string, DeliveryDefinition>;

  constructor(definitions: readonly DeliveryDefinition[] = [createGitHubDeliveryDefinition()]) {
    this.byId = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  get(integrationId: string): DeliveryDefinition | null {
    return this.byId.get(integrationId) ?? null;
  }

  route(integrationId: string, routeId: string): DeliveryRoute | null {
    const routes = this.get(integrationId)?.routes;
    return routes && Object.prototype.hasOwnProperty.call(routes, routeId) ? routes[routeId]! : null;
  }
}
