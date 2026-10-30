/**
 * The GitHub integration's GraphQL on a real built server with its own application vault (DS-001), for everything
 * that needs no answer from GitHub: the status of a node that never connected, agent ticks kept in the connections
 * file, coded errors for test and an empty token, and an idempotent disconnect. Connecting with a real token is the
 * live test's job (`github-credential-proxy-live.e2e.test.ts`).
 * Prerequisite: a current build (`pnpm -C autobyteus-server-ts build`).
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type GraphqlBody<T> = { data?: T | null; errors?: Array<{ message: string; extensions?: { code?: string } }> };

const STATUS_FIELDS = "connected login connectedAt agentDefinitionIds";

describe("GitHub integration GraphQL (built server)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `github-integration-graphql-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/github-integration-graphql-${suffix}.db`);
  let server: RunningTestServer;

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<GraphqlBody<T>> => {
    const response = await fetch(`${server.serverUrl}/graphql`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    return await response.json() as GraphqlBody<T>;
  };

  beforeAll(async () => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
  }, 180_000);

  afterAll(async () => {
    if (server?.child.exitCode === null) await server.stop();
    await removeOwnedTestRuntime(runtimeRoot, database);
  }, 60_000);

  it("reports a node that never connected", async () => {
    expect(await gql(`query { githubIntegration { ${STATUS_FIELDS} } }`)).toEqual({
      data: { githubIntegration: { connected: false, login: null, connectedAt: null, agentDefinitionIds: [] } },
    });
  });

  it("keeps agent ticks in the connections file, and across a disconnect", async () => {
    const set = await gql<{ setGitHubIntegrationAgentAccess: { agentDefinitionIds: string[] } }>(
      `mutation($ids: [String!]!) { setGitHubIntegrationAgentAccess(agentDefinitionIds: $ids) { ${STATUS_FIELDS} } }`,
      { ids: ["agent-a", "agent-b", "agent-a"] });
    expect(set.data?.setGitHubIntegrationAgentAccess).toEqual({
      connected: false, login: null, connectedAt: null, agentDefinitionIds: ["agent-a", "agent-b"],
    });
    const file = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "integrations", "connections.json"), "utf8"));
    expect(file.integrations.github.agentDefinitionIds).toEqual(["agent-a", "agent-b"]);

    const disconnected = await gql(`mutation { disconnectGitHubIntegration { ${STATUS_FIELDS} } }`);
    expect(disconnected).toEqual({ data: { disconnectGitHubIntegration: {
      connected: false, login: null, connectedAt: null, agentDefinitionIds: ["agent-a", "agent-b"] } } });
  });

  it("answers test without a connection, and an empty token, with coded errors", async () => {
    const tested = await gql(`mutation { testGitHubIntegration { ${STATUS_FIELDS} } }`);
    expect(tested.errors?.map((error) => error.extensions?.code)).toEqual(["INTEGRATION_NOT_CONNECTED"]);
    const empty = await gql(`mutation { connectGitHubIntegration(token: "  ") { ${STATUS_FIELDS} } }`);
    expect(empty.errors?.map((error) => error.extensions?.code)).toEqual(["TOKEN_REQUIRED"]);
  });
});
