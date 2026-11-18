// Node files (autobyteus-436): `GET /rest/node-files/content?path=<absolute>` on the real studio server, behind the
// node access gate. One file by absolute path, read-only, answered as a user file, for owner and phone credentials
// (NAS-39); peers and memory sync sources are refused (NAS-40). The files live outside every workspace.
// Run (clean environment, TESTING.md):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/node-files/node-files.e2e.test.ts --no-watch
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { configureNodeIdentityCapability } from "../../../src/remote-access/services/node-identity-service.js";
import { signPeerRequest } from "../../../src/remote-collaboration/channel/peer-request-signature.js";
import { startStudioE2eRuntimeServer, type StartedStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const PEER = { nodeId: "srv_node_files_peer_0000000000000000000", secret: randomBytes(32).toString("base64url") };
const ROUTE = "/rest/node-files/content";

describe("Node files: one file by absolute path, read-only (autobyteus-436)", () => {
  let dataDir: string;
  let outside: string;
  let started: StartedStudioE2eRuntimeServer;
  let ownNodeId: string;
  let phoneCredential: string;
  const output: string[] = [];

  const inject = (options: { method?: "GET" | "POST" | "PUT" | "DELETE"; url: string; headers?: Record<string, string>; payload?: string }) =>
    started.fastify.inject({ method: options.method ?? "GET", url: options.url, remoteAddress: "127.0.0.1", headers: options.headers, payload: options.payload } as never);
  const owner = () => ({ authorization: `Bearer ${started.ownerCredential}` });
  const fileUrl = (absolutePath: string) => `${ROUTE}?path=${encodeURIComponent(absolutePath)}`;

  beforeAll(async () => {
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { output.push(args.map(String).join(" ")); });
    }
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "node-files-")));
    outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "node-files-outside-")));
    await fs.mkdir(path.join(outside, "worktree", "tickets"), { recursive: true });
    await fs.writeFile(path.join(outside, "worktree", "tickets", "data-contract.md"), "# Data contract\n");
    await fs.writeFile(path.join(outside, "worktree", "diagram.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    await fs.symlink(path.join(outside, "worktree", "tickets", "data-contract.md"), path.join(outside, "contract-link.md"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\n", "utf-8");
    await fs.mkdir(path.join(dataDir, "remote-collaboration"), { recursive: true });
    await fs.writeFile(path.join(dataDir, "remote-collaboration", "peers.json"), JSON.stringify({ peers: [
      { nodeId: PEER.nodeId, name: "peer", baseUrl: "http://127.0.0.1:9", addedAt: new Date().toISOString(), peerSecret: PEER.secret },
    ] }), { mode: 0o600 });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    configureNodeIdentityCapability(true);
    configureMemorySyncCapability(true);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    ownNodeId = (await inject({ url: "/rest/remote-access/status" })).json().nodeId;
    expect((await inject({ method: "PUT", url: "/rest/remote-access/settings", headers: { ...owner(), "content-type": "application/json" }, payload: JSON.stringify({ phoneAccessEnabled: true }) })).statusCode).toBe(200);
    const session = (await inject({ method: "POST", url: "/rest/remote-access/pairing-sessions", headers: { ...owner(), "content-type": "application/json" },
      payload: JSON.stringify({ connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", serverName: "Node Files" }) })).json();
    const exchange = await inject({ method: "POST", url: "/rest/remote-access/pairing-exchanges", headers: { "content-type": "application/json" },
      payload: JSON.stringify({ pairingCode: session.payload.pairingCode, serverBaseUrl: String(session.mobileUrl).split("?", 1)[0], deviceName: "Node Files Phone" }) });
    phoneCredential = exchange.json().credential;
    expect(phoneCredential).toMatch(/^mra_/);
  }, 90_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await started?.fastify.close();
    await fs.rm(dataDir, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });

  it("NAS-39 the owner and a paired phone read a file outside every workspace, read-only, with the user-file headers", async () => {
    const markdown = path.join(outside, "worktree", "tickets", "data-contract.md");
    for (const credential of [started.ownerCredential, phoneCredential]) {
      const answer = await inject({ url: fileUrl(markdown), headers: { authorization: `Bearer ${credential}` } });
      expect(answer.statusCode).toBe(200);
      expect(answer.body).toBe("# Data contract\n");
      expect(answer.headers["content-type"]).toContain("text/markdown");
      expect(answer.headers["content-security-policy"]).toBe("sandbox allow-scripts");
      expect(answer.headers["x-content-type-options"]).toBe("nosniff");
    }
    const image = await inject({ url: fileUrl(path.join(outside, "worktree", "diagram.png")), headers: { authorization: `Bearer ${phoneCredential}` } });
    expect(image.statusCode).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
    expect(image.rawPayload.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it("NAS-39 refuses a relative path, a '..' path and a folder 400, a missing file 404, and follows a symbolic link to its file", async () => {
    const asPhone = (pathText: string) => inject({ url: fileUrl(pathText), headers: { authorization: `Bearer ${phoneCredential}` } });
    expect((await asPhone("worktree/tickets/data-contract.md")).json()).toMatchObject({ code: "NODE_FILE_PATH_INVALID" });
    expect((await asPhone("worktree/tickets/data-contract.md")).statusCode).toBe(400);
    const dotDot = await asPhone(path.join(outside, "worktree") + "/../worktree/tickets/data-contract.md");
    expect({ status: dotDot.statusCode, code: dotDot.json().code }).toEqual({ status: 400, code: "NODE_FILE_PATH_INVALID" });
    const missing = await asPhone(path.join(outside, "missing.md"));
    expect({ status: missing.statusCode, body: missing.json() }).toEqual({ status: 404, body: { code: "NODE_FILE_NOT_FOUND", message: "No file exists at this path." } });
    const folder = await asPhone(path.join(outside, "worktree"));
    expect({ status: folder.statusCode, code: folder.json().code }).toEqual({ status: 400, code: "NODE_FILE_IS_FOLDER" });
    const noPath = await inject({ url: ROUTE, headers: { authorization: `Bearer ${phoneCredential}` } });
    expect({ status: noPath.statusCode, code: noPath.json().code }).toEqual({ status: 400, code: "NODE_FILE_PATH_INVALID" });
    const link = await asPhone(path.join(outside, "contract-link.md"));
    expect({ status: link.statusCode, body: link.body }).toEqual({ status: 200, body: "# Data contract\n" });
  });

  it("NAS-40 a peer and a memory sync source are refused 403 NODE_ROUTE_NOT_PERMITTED; no credential is refused 401", async () => {
    const url = fileUrl(path.join(outside, "worktree", "tickets", "data-contract.md"));
    const signed = signPeerRequest({ secret: PEER.secret, method: "GET", pathWithQuery: url, fromNodeId: PEER.nodeId, toNodeId: ownNodeId, body: null });
    const peer = await inject({ url, headers: signed });
    expect({ status: peer.statusCode, code: peer.json().code }).toEqual({ status: 403, code: "NODE_ROUTE_NOT_PERMITTED" });

    const hub = await inject({ method: "POST", url: "/graphql", headers: { ...owner(), "content-type": "application/json" },
      payload: JSON.stringify({ query: "mutation($input: UpdateMemoryHubConfigInput!) { updateMemoryHubConfig(input: $input) { oneTimePlaintextToken } }",
        variables: { input: { enabled: true, advertisedHubBaseUrl: "http://127.0.0.1:8000" } } }) });
    const hubToken = String(hub.json().data?.updateMemoryHubConfig?.oneTimePlaintextToken);
    expect(hubToken).toMatch(/^mhub_/);
    const source = await inject({ url, headers: { authorization: `Bearer ${hubToken}` } });
    expect({ status: source.statusCode, code: source.json().code }).toEqual({ status: 403, code: "NODE_ROUTE_NOT_PERMITTED" });

    const anonymous = await inject({ url });
    expect({ status: anonymous.statusCode, code: anonymous.json().code }).toEqual({ status: 401, code: "NODE_CREDENTIAL_REQUIRED" });
  });

  it("NAS-39 only reads: POST, PUT and DELETE are not served, and no folder is listed", async () => {
    const url = fileUrl(path.join(outside, "worktree", "tickets", "data-contract.md"));
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      const answer = await inject({ method, url, headers: { ...owner(), "content-type": "application/json" }, payload: "{}" });
      expect(answer.statusCode, method).toBe(404);
    }
    expect(await fs.readFile(path.join(outside, "worktree", "tickets", "data-contract.md"), "utf8")).toBe("# Data contract\n");
  });

  it("logs no node file path (QR-001)", () => {
    expect(output.filter((line) => line.includes(outside))).toEqual([]);
  });
});
