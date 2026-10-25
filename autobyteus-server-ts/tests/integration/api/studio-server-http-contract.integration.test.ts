// HTTP contract of the real studio server that the Fastify 5 move must keep
// (autobyteus-248). It starts the studio composition on a loopback port and
// sends real HTTP requests:
// - GraphQL is served at POST /graphql, and the GraphiQL IDE pages are gone.
// - A trusted-network client (non-loopback socket address) can POST /graphql,
//   but GET /graphql stays local-only, and no GraphiQL page is served to it.
// - The MCP gateway's CORS answers: its access gate answers preflights and
//   rejects foreign origins, and the studio CORS plugin adds its headers to
//   loopback-origin requests. A route config such as { cors: false } would
//   turn those plugin headers off on Fastify 5.
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

const LOOPBACK_ORIGIN = "http://127.0.0.1:3000";
const FOREIGN_ORIGIN = "https://evil.example";
const TRUSTED_NETWORK_CLIENT = "192.168.1.50";
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
      headers: { accept: "application/json", "content-type": "application/json", ...headers },
    });

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-server-http-contract-"));
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    baseUrl = new URL(started.mainUrl);
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

  it("lets a trusted-network client POST /graphql but keeps GET /graphql local-only and serves it no GraphiQL page", async () => {
    const post = await started.fastify.inject({
      method: "POST",
      url: "/graphql",
      remoteAddress: TRUSTED_NETWORK_CLIENT,
      headers: { "content-type": "application/json" },
      payload: typenameQuery,
    });
    expect(post.statusCode).toBe(200);
    expect(post.json()).toEqual({ data: { __typename: "Query" } });

    const get = await started.fastify.inject({
      method: "GET",
      url: "/graphql?query=%7B__typename%7D",
      remoteAddress: TRUSTED_NETWORK_CLIENT,
    });
    expect(get.statusCode).toBe(404);
    expect(get.json()).toMatchObject({ code: "REMOTE_ACCESS_ROUTE_UNSUPPORTED" });

    const graphiql = await started.fastify.inject({
      method: "GET",
      url: "/graphiql",
      remoteAddress: TRUSTED_NETWORK_CLIENT,
    });
    expect(graphiql.statusCode).toBe(404);
    expect(String(graphiql.headers["content-type"])).not.toContain("text/html");
  });

  it("answers MCP gateway preflights from its access gate and rejects foreign origins", async () => {
    const loopbackPreflight = await mcpGateway({
      method: "OPTIONS",
      headers: {
        origin: LOOPBACK_ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(loopbackPreflight.status).toBe(204);
    expect(corsHeaders(loopbackPreflight)).toEqual({
      "access-control-allow-headers": MCP_GATEWAY_ALLOWED_HEADERS,
      "access-control-allow-methods": MCP_GATEWAY_ALLOWED_METHODS,
      "access-control-allow-origin": LOOPBACK_ORIGIN,
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
  });

  it("adds the studio CORS plugin's headers to MCP gateway requests", async () => {
    const loopbackPost = await mcpPost({ origin: LOOPBACK_ORIGIN });
    expect(loopbackPost.status).toBe(200);
    expect(await loopbackPost.json()).toMatchObject({ jsonrpc: "2.0", id: "contract-ping", result: {} });
    expect(corsHeaders(loopbackPost)).toEqual({
      "access-control-allow-origin": LOOPBACK_ORIGIN,
      vary: "Origin",
    });

    const noOriginPost = await mcpPost();
    expect(noOriginPost.status).toBe(200);
    expect(corsHeaders(noOriginPost)).toEqual({ vary: "Origin" });
  });
});
