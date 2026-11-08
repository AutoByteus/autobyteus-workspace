/**
 * A peer address whose node refuses the host name it is addressed by (autobyteus-426 REQ-020, AC-020 (1)).
 *
 * Purpose: `addPeerNode` at a name the peer's Host gate refuses reports `PEER_HOST_REFUSED` with the host, and the
 * address resolution the Nodes page's connect flow asks for records the attempt as `host_refused`, through the real
 * GraphQL API, the real probe over HTTP and the real Host gate (not "not an AutoByteus node").
 * Setup: one in-process studio server on a test-owned data folder; it is its own "peer", addressed as `lvh.me` (a
 * public name that resolves to 127.0.0.1, the 416 API-04 case). The Host gate refuses it before any identity check.
 * Prerequisite: `lvh.me` resolves to a loopback address (public DNS); otherwise the case is skipped with that reason.
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/peer-host-refused.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import dns from "node:dns/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureNodeIdentityCapability, resetNodeIdentityServiceForTests } from "../../../src/remote-access/services/node-identity-service.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const REFUSED_NAME = "lvh.me";
const resolvesToLoopback = await dns.lookup(REFUSED_NAME).then(({ address }) => address === "127.0.0.1" || address === "::1", () => false);

describe.skipIf(!resolvesToLoopback)(`A peer address at a host name its node refuses (${REFUSED_NAME} must resolve to loopback)`, () => {
  let dataDir: string;
  let server: Awaited<ReturnType<typeof startStudioE2eRuntimeServer>>;

  const graphql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(new URL("/graphql", server.mainUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as { data?: any; errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
  };

  beforeAll(async () => {
    dataDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "peer-host-refused-")));
    fs.writeFileSync(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    // A fresh data folder has nothing to migrate: startup marks the node identity ready (as the other route E2Es do).
    configureNodeIdentityCapability(true);
    server = await startStudioE2eRuntimeServer();
    const enabled = await graphql("mutation { setRemoteCollaborationEnabled(enabled: true) { enabled } }");
    expect(enabled.errors).toBeUndefined();
  }, 120_000);

  afterAll(async () => {
    await server?.fastify.close();
    configureNodeIdentityCapability(false);
    resetNodeIdentityServiceForTests();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("addPeerNode reports PEER_HOST_REFUSED with the refused host; an IP address of the same node is not refused", async () => {
    const port = server.mainUrl.port;
    const baseUrl = `http://${REFUSED_NAME}:${port}`;
    const refused = await graphql(`
      mutation Add($input: AddPeerNodeInput!) { addPeerNode(input: $input) { nodeId } }
    `, { input: { nodeId: "srv_peer_node_000000000000000000000000", name: "office", baseUrl } });

    expect(refused.data).toBeNull();
    expect(refused.errors?.[0]?.extensions).toMatchObject({ code: "PEER_HOST_REFUSED", host: REFUSED_NAME, address: baseUrl });
    expect(refused.errors?.[0]?.message).toBe(`${baseUrl} refuses the name ${REFUSED_NAME}; add it to AUTOBYTEUS_ALLOWED_HOSTS on that node.`);

    // The same node at its IP address passes the Host gate: the probe then reaches the identity check.
    const byIp = await graphql(`
      mutation Add($input: AddPeerNodeInput!) { addPeerNode(input: $input) { nodeId } }
    `, { input: { nodeId: "srv_peer_node_000000000000000000000000", name: "office", baseUrl: `http://127.0.0.1:${port}` } });
    expect(byIp.errors?.[0]?.extensions?.code).not.toBe("PEER_HOST_REFUSED");
  });

  it("the address resolution records a refused name as host_refused among its attempts", async () => {
    const port = server.mainUrl.port;
    const refusedUrl = `http://${REFUSED_NAME}:${port}`;
    const answer = await graphql(`
      query Resolve($nodeId: String!, $baseUrls: [String!]!) { resolvePeerAddress(nodeId: $nodeId, baseUrls: $baseUrls) }
    `, { nodeId: "srv_peer_node_000000000000000000000000", baseUrls: [refusedUrl] });

    expect(answer.data).toBeNull();
    expect(answer.errors?.[0]?.extensions?.attempts).toEqual([{ address: refusedUrl, result: "host_refused" }]);
  });
});
