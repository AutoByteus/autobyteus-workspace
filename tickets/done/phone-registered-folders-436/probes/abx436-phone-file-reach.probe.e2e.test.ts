// autobyteus-436 investigation probe (temporary; the canonical copy lives in the ticket's probes folder).
// Question: which files can a paired phone's credential read from the node today, and is the
// "only the run's workspace" limit enforced by the node or only by the phone shell?
// Run: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/abx436-phone-file-reach.probe.e2e.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { PairingExchangeResult } from "../../../src/remote-access/domain/models.js";
import { configureNodeIdentityCapability } from "../../../src/remote-access/services/node-identity-service.js";
import {
  startStudioE2eRuntimeServer,
  type StartedStudioE2eRuntimeServer,
} from "../helpers/studio-runtime-test-server.js";

const TRUSTED_NETWORK_CLIENT = "100.64.1.2";

describe("abx436 probe: what a phone can read", () => {
  let appDataDir: string;
  let outsideDir: string;
  let started: StartedStudioE2eRuntimeServer;
  let phone: PairingExchangeResult;

  const inject = (options: { method: "GET" | "POST" | "PUT"; url: string; headers?: Record<string, string>; payload?: unknown }) =>
    started.fastify.inject({ remoteAddress: TRUSTED_NETWORK_CLIENT, ...options } as never);

  const gql = (query: string, variables: Record<string, unknown>, credential?: string) =>
    inject({
      method: "POST",
      url: "/graphql",
      headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
      payload: JSON.stringify({ query, variables }),
    });

  const createWorkspace = (rootPath: string, credential?: string) =>
    gql("mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId workspaceRootPath } }", { input: { rootPath } }, credential);

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "abx436-node-"));
    outsideDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "abx436-outside-")));
    await fs.mkdir(path.join(outsideDir, "worktree-a"), { recursive: true });
    await fs.writeFile(path.join(outsideDir, "worktree-a", "data-contract.md"), "# data contract (probe)\n");
    await fs.writeFile(path.join(outsideDir, "secret.txt"), "PROBE-NOT-A-SECRET\n");
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    configureNodeIdentityCapability(true);
    expect((await inject({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: true } })).statusCode).toBe(200);
    const session = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      payload: { connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", serverName: "Probe" },
    });
    const { payload, mobileUrl } = session.json() as { payload: { pairingCode: string }; mobileUrl: string };
    const exchange = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      payload: { pairingCode: payload.pairingCode, serverBaseUrl: mobileUrl.split("?", 1)[0], deviceName: "abx436 probe phone" },
    });
    phone = exchange.json() as PairingExchangeResult;
    expect(phone.credential).toMatch(/^mra_/);
  }, 60_000);

  afterAll(async () => {
    await started?.fastify.close();
    await fs.rm(appDataDir, { recursive: true, force: true });
    await fs.rm(outsideDir, { recursive: true, force: true });
  });

  it("P1+P2: a phone credential registers any folder as a workspace and reads a file in it", async () => {
    const created = await createWorkspace(outsideDir, phone.credential);
    const body = created.json() as { data?: { createWorkspace?: { workspaceId: string } }; errors?: unknown };
    console.info("P1 createWorkspace (phone)", created.statusCode, JSON.stringify(body));
    expect(created.statusCode).toBe(200);
    const workspaceId = body.data!.createWorkspace!.workspaceId;
    const read = await inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspaceId)}/content?path=${encodeURIComponent("secret.txt")}`,
      headers: { authorization: `Bearer ${phone.credential}` },
    });
    console.info("P2 read secret.txt (phone)", read.statusCode, JSON.stringify(read.body));
    expect(read.statusCode).toBe(200);
    expect(read.body).toContain("PROBE-NOT-A-SECRET");
    const nested = await inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspaceId)}/content?path=${encodeURIComponent("worktree-a/data-contract.md")}`,
      headers: { authorization: `Bearer ${phone.credential}` },
    });
    console.info("P2b read worktree-a/data-contract.md (phone)", nested.statusCode);
    expect(nested.statusCode).toBe(200);
  });

  it("P3: a trusted-network client with no credential does the same", async () => {
    const created = await createWorkspace(path.join(outsideDir, "worktree-a"));
    const body = created.json() as { data?: { createWorkspace?: { workspaceId: string } } };
    console.info("P3 createWorkspace (no credential)", created.statusCode, JSON.stringify(body));
    const workspaceId = body.data!.createWorkspace!.workspaceId;
    const read = await inject({ method: "GET", url: `/rest/workspaces/${encodeURIComponent(workspaceId)}/content?path=data-contract.md` });
    console.info("P3 read (no credential)", read.statusCode);
    expect(read.statusCode).toBe(200);
  });

  it("P4: the workspace content route refuses a path that leaves the workspace root", async () => {
    const created = await createWorkspace(path.join(outsideDir, "worktree-a"), phone.credential);
    const workspaceId = (created.json() as { data: { createWorkspace: { workspaceId: string } } }).data.createWorkspace.workspaceId;
    const read = await inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspaceId)}/content?path=${encodeURIComponent("../secret.txt")}`,
      headers: { authorization: `Bearer ${phone.credential}` },
    });
    console.info("P4 ../secret.txt (phone)", read.statusCode, read.body);
    expect(read.statusCode).not.toBe(200);
  });

  it("P5: a phone credential lists every registered workspace root", async () => {
    const listed = await gql("{ workspaces { workspaceId workspaceRootPath } }", {}, phone.credential);
    console.info("P5 workspaces (phone)", listed.statusCode, listed.body);
    expect(listed.body).toContain(outsideDir);
  });
});
