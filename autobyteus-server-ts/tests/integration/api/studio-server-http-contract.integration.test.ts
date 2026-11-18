// HTTP contract of the real studio server that the Fastify 5 move must keep
// (autobyteus-248). It starts the studio composition on a loopback port and
// sends real HTTP requests:
// - GraphQL is served at POST /graphql, and the GraphiQL IDE pages are gone.
// - Every request needs a credential and an admitted network (autobyteus-437):
//   the owner's credential opens POST /graphql; a client from a network the
//   node does not admit is refused before its credential is read; no GraphiQL
//   page is served.
// - The MCP gateway's CORS answers: its access gate answers preflights and
//   rejects foreign and unlisted localhost origins (autobyteus-416), and the
//   studio CORS plugin adds its headers to requests from a configured origin
//   that carry the gateway token (autobyteus-437: always required).
//   A route config such as { cors: false } would turn those plugin headers off
//   on Fastify 5.
// Run: pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/studio-server-http-contract.integration.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  startStudioE2eRuntimeServer,
  type StartedStudioE2eRuntimeServer,
} from "../../e2e/helpers/studio-runtime-test-server.js";

/** A development frontend's origin, listed in AUTOBYTEUS_ALLOWED_ORIGINS as the launchers do (autobyteus-416 REQ-005). */
const CONFIGURED_ORIGIN = "http://127.0.0.1:3000";
const UNLISTED_LOCALHOST_ORIGIN = "http://localhost:5173";
const FOREIGN_ORIGIN = "https://evil.example";
/** A local network the node was not told to admit (no allowed local network, no AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS). */
const NOT_ADMITTED_CLIENT = "192.168.1.50";
const GRAPHIQL_PATHS = ["/graphiql", "/graphiql/main.js", "/graphiql/config.js", "/graphiql/sw.js"];
const MCP_GATEWAY_ALLOWED_HEADERS = "authorization, content-type, accept, mcp-protocol-version, mcp-session-id";
const MCP_GATEWAY_ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS";

const typenameQuery = JSON.stringify({ query: "{ __typename }" });
const mcpPing = JSON.stringify({ jsonrpc: "2.0", id: "contract-ping", method: "ping", params: {} });

const corsHeaders = (response: Response): Record<string, string> =>
  Object.fromEntries(
    [...response.headers.entries()].filter(([name]) => name.startsWith("access-control-") || name === "vary"),
  );

describe("Studio server HTTP contract", () => {
  let appDataDir: string;
  let started: StartedStudioE2eRuntimeServer;
  let baseUrl: URL;
  let gatewayToken: string;

  const http = (pathname: string, init?: RequestInit) => fetch(new URL(pathname, baseUrl), init);

  const mcpGateway = (init: { method: "POST" | "OPTIONS"; headers: Record<string, string> }) =>
    http("/mcp/gateway", {
      method: init.method,
      headers: init.headers,
      body: init.method === "POST" ? mcpPing : undefined,
    });

  const mcpPost = (headers: Record<string, string> = {}) =>
    mcpGateway({
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${gatewayToken}`, ...headers },
    });

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-server-http-contract-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nAUTOBYTEUS_ALLOWED_ORIGINS=${CONFIGURED_ORIGIN}\n`,
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    baseUrl = new URL(started.mainUrl);
    // The owner reads the gateway token (an owner route; this process attaches the launch credential).
    gatewayToken = ((await (await http("/rest/mcp-gateway/token")).json()) as { token: string }).token;
  }, 30_000);

  afterAll(async () => {
    await started?.fastify.close();
    await fs.rm(appDataDir, { recursive: true, force: true });
  });

  it("serves GraphQL at POST /graphql and no GraphiQL page", async () => {
    const graphql = await http("/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typenameQuery,
    });
    expect(graphql.status).toBe(200);
    expect(await graphql.json()).toEqual({ data: { __typename: "Query" } });

    for (const graphiqlPath of GRAPHIQL_PATHS) {
      const response = await http(graphiqlPath);
      expect({ path: graphiqlPath, status: response.status }).toEqual({ path: graphiqlPath, status: 404 });
      expect(response.headers.get("content-type") ?? "").not.toContain("text/html");
    }
  });

  it("opens POST /graphql to the owner's credential, refuses a network the node does not admit, and serves no GraphiQL page", async () => {
    const owner = { authorization: `Bearer ${started.ownerCredential}` };
    const post = await started.fastify.inject({
      method: "POST",
      url: "/graphql",
      remoteAddress: "127.0.0.1",
      headers: { "content-type": "application/json", ...owner },
      payload: typenameQuery,
    });
    expect(post.statusCode).toBe(200);
    expect(post.json()).toEqual({ data: { __typename: "Query" } });

    const notAdmitted = await started.fastify.inject({
      method: "POST",
      url: "/graphql",
      remoteAddress: NOT_ADMITTED_CLIENT,
      headers: { "content-type": "application/json", ...owner },
      payload: typenameQuery,
    });
    expect(notAdmitted.statusCode).toBe(403);
    expect(notAdmitted.json()).toMatchObject({ code: "NODE_NETWORK_REFUSED" });

    const withoutCredential = await started.fastify.inject({
      method: "GET",
      url: "/graphql?query=%7B__typename%7D",
      remoteAddress: "127.0.0.1",
    });
    expect(withoutCredential.statusCode).toBe(401);
    expect(withoutCredential.json()).toMatchObject({ code: "NODE_CREDENTIAL_REQUIRED" });

    const graphiql = await started.fastify.inject({
      method: "GET",
      url: "/graphiql",
      remoteAddress: "127.0.0.1",
      headers: owner,
    });
    expect(graphiql.statusCode).toBe(404);
    expect(String(graphiql.headers["content-type"])).not.toContain("text/html");
  });

  it("answers MCP gateway preflights for a configured origin and rejects foreign and unlisted localhost origins", async () => {
    const configuredPreflight = await mcpGateway({
      method: "OPTIONS",
      headers: {
        origin: CONFIGURED_ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(configuredPreflight.status).toBe(204);
    expect(corsHeaders(configuredPreflight)).toEqual({
      "access-control-allow-headers": MCP_GATEWAY_ALLOWED_HEADERS,
      "access-control-allow-methods": MCP_GATEWAY_ALLOWED_METHODS,
      "access-control-allow-origin": CONFIGURED_ORIGIN,
      vary: "Origin",
    });

    const foreignPreflight = await mcpGateway({
      method: "OPTIONS",
      headers: { origin: FOREIGN_ORIGIN, "access-control-request-method": "POST" },
    });
    expect(foreignPreflight.status).toBe(403);
    expect(corsHeaders(foreignPreflight)).toEqual({});

    const foreignPost = await mcpPost({ origin: FOREIGN_ORIGIN });
    expect(foreignPost.status).toBe(403);
    expect(corsHeaders(foreignPost)).toEqual({});

    for (const method of ["OPTIONS", "POST"] as const) {
      const unlisted = method === "POST"
        ? await mcpPost({ origin: UNLISTED_LOCALHOST_ORIGIN })
        : await mcpGateway({ method, headers: { origin: UNLISTED_LOCALHOST_ORIGIN, "access-control-request-method": "POST" } });
      expect(unlisted.status, method).toBe(403);
      expect(corsHeaders(unlisted), method).toEqual({});
    }
  });

  it("adds the studio CORS plugin's headers to MCP gateway requests", async () => {
    const configuredPost = await mcpPost({ origin: CONFIGURED_ORIGIN });
    expect(configuredPost.status).toBe(200);
    expect(await configuredPost.json()).toMatchObject({ jsonrpc: "2.0", id: "contract-ping", result: {} });
    expect(corsHeaders(configuredPost)).toEqual({
      "access-control-allow-origin": CONFIGURED_ORIGIN,
      vary: "Origin",
    });

    const noOriginPost = await mcpPost();
    expect(noOriginPost.status).toBe(200);
    expect(corsHeaders(noOriginPost)).toEqual({ vary: "Origin" });
  });
});
