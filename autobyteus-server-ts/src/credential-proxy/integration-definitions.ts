import type { IntegrationId } from "../secret-management/domain/secret-id.js";

/** How a route adds the integration's credential to an upstream request. */
export type IntegrationAuthFormat = "bearer" | "basic-x-access-token";

/**
 * One forwarding target of an integration (a route), with its own auth format and allowed paths. The upstream
 * origin is a field, so where the proxy forwards to can become configurable later (DEC-010).
 */
export type IntegrationRoute = Readonly<{
  id: string;
  origin: string;
  /** Prefix added before the caller's path (empty for both GitHub routes). */
  basePath: string;
  auth: IntegrationAuthFormat;
  /** Whether the request body is buffered (sent with its length) or streamed (git packs can be large). */
  buffersRequestBody: boolean;
  /** Whether a text or JSON response body is buffered so an echo of the token can be redacted. */
  redactsTextBodies: boolean;
  /** Whether an upstream `401` becomes `403 UPSTREAM_REJECTED_TOKEN` (git would otherwise prompt for a password). */
  mapsUnauthorizedToForbidden: boolean;
  allows(method: string, pathname: string): boolean;
}>;

/**
 * The app-owned description of one integration: its routes, upstream addresses, auth formats and shell variables.
 * Never read from an installed skill, so where a token may go is decided by the app (REQ-005, DEC-005).
 */
export type IntegrationDefinition = Readonly<{
  id: IntegrationId;
  displayName: string;
  description: string;
  routes: Readonly<Record<string, IntegrationRoute>>;
  /**
   * The variables a run's shell gets for this integration. `env` is the environment so far (the run's base
   * environment plus earlier integrations' variables): git config is appended after its `GIT_CONFIG_COUNT` entries.
   */
  shellVariables(proxyBaseUrl: string, pass: string, env: Readonly<Record<string, string | undefined>>): Record<string, string>;
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

export type GitHubDefinitionOrigins = Readonly<{ apiOrigin: string; gitOrigin: string }>;

/** GitHub: the REST/GraphQL API (`Bearer`) and git smart-HTTP (`Basic x-access-token:<token>`, M-3). */
export const createGitHubDefinition = (
  origins: GitHubDefinitionOrigins = { apiOrigin: "https://api.github.com", gitOrigin: "https://github.com" },
): IntegrationDefinition => Object.freeze({
  id: "github",
  displayName: "GitHub",
  description: "Lets the agents you choose call the GitHub API and use git with your token, without seeing it.",
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
});

/** The integrations the app defines. Jira is added later as one more definition on the same proxy (REQ-011). */
export class IntegrationDefinitions {
  private readonly byId: ReadonlyMap<string, IntegrationDefinition>;

  constructor(definitions: readonly IntegrationDefinition[] = [createGitHubDefinition()]) {
    this.byId = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  get(integrationId: string): IntegrationDefinition | null {
    return this.byId.get(integrationId) ?? null;
  }

  route(integrationId: string, routeId: string): IntegrationRoute | null {
    const routes = this.get(integrationId)?.routes;
    return routes && Object.prototype.hasOwnProperty.call(routes, routeId) ? routes[routeId]! : null;
  }
}
