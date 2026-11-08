// Workspace file search through the node access gate on the real studio server (autobyteus-437 CR-004): the gate's
// body hooks read every request's body before Mercurius builds the GraphQL context; a request whose body was read is
// not an aborted request, so `searchFiles` finds the file for the owner and for a paired phone.
// Run (clean environment, TESTING.md):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/search-files-through-gate.e2e.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureNodeIdentityCapability } from "../../../src/remote-access/services/node-identity-service.js";
import { startStudioE2eRuntimeServer, type StartedStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

describe("searchFiles through the node access gate", () => {
  let dataDir: string;
  let folder: string;
  let started: StartedStudioE2eRuntimeServer;

  const graphql = async (query: string, variables: Record<string, unknown>, authorization?: string) => {
    const response = await fetch(new URL("/graphql", started.mainUrl), {
      method: "POST",
      headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    expect(response.status).toBe(200);
    return await response.json() as { data?: Record<string, any>; errors?: unknown[] };
  };

  const pairPhone = async (): Promise<string> => {
    const owner = { "content-type": "application/json" };
    expect((await fetch(new URL("/rest/remote-access/settings", started.mainUrl), { method: "PUT", headers: owner, body: JSON.stringify({ phoneAccessEnabled: true }) })).status).toBe(200);
    const session = await (await fetch(new URL("/rest/remote-access/pairing-sessions", started.mainUrl), { method: "POST", headers: owner,
      body: JSON.stringify({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", serverName: "Search" }) })).json() as { payload: { pairingCode: string }; mobileUrl: string };
    const exchange = await (await fetch(new URL("/rest/remote-access/pairing-exchanges", started.mainUrl), { method: "POST", headers: owner,
      body: JSON.stringify({ pairingCode: session.payload.pairingCode, serverBaseUrl: session.mobileUrl.split("?", 1)[0], deviceName: "Search Phone" }) })).json() as { credential: string };
    return exchange.credential;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "search-files-gate-"));
    folder = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "search-files-workspace-")));
    await fs.mkdir(path.join(folder, "src"), { recursive: true });
    await fs.writeFile(path.join(folder, "src", "app.ts"), "export {};\n");
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    configureNodeIdentityCapability(true);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
  }, 60_000);

  afterAll(async () => {
    await started?.fastify.close();
    await fs.rm(dataDir, { recursive: true, force: true });
    await fs.rm(folder, { recursive: true, force: true });
  });

  it("finds a workspace file for the owner and for a paired phone", async () => {
    const created = await graphql("mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId } }", { input: { rootPath: folder } });
    const workspaceId = created.data?.createWorkspace?.workspaceId as string;
    expect(workspaceId, JSON.stringify(created)).toBeTruthy();
    const search = "query($id: String!, $q: String!) { searchFiles(workspaceId: $id, query: $q) }";
    expect((await graphql(search, { id: workspaceId, q: "app" })).data?.searchFiles).toEqual(["src/app.ts"]);
    const phone = await pairPhone();
    expect((await graphql(search, { id: workspaceId, q: "app" }, `Bearer ${phone}`)).data?.searchFiles).toEqual(["src/app.ts"]);
  });
});
