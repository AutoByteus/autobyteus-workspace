import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  PEERS_TO_NODE_KEYS_MIGRATION_ID,
  PeersToNodeKeysMigration,
} from "../../../src/app-data-migrations/migrations/peers-to-node-keys/peers-to-node-keys-migration.js";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";

/**
 * autobyteus-661 (D-2…D-4; design § Persisted Data): `peers.json` loses its shared secrets and `.env` its collaboration
 * switch. Synthesized fixtures only (TESTING.md): each is the released writer's exact output (`PeerStore.write` through
 * v1.5.15-beta.3: two-space JSON, mode 0600, `peerSecret` and `role` only when set). Shape inventory → fixture:
 * - paired since autobyteus-437 (`peerSecret`, no `role`): PAIRED_ROW;
 * - registered before 437 (no `peerSecret`): UNPAIRED_ROW;
 * - a sandbox (autobyteus-581, `role: "sandbox"` with `peerSecret`): SANDBOX_ROW;
 * - `role: null` (not written by the released writer, read by it): NULL_ROLE_ROW;
 * - data like the founder's (3 paired peers, the switch `true`): FOUNDER_LIKE (synthesized names, IDs and addresses).
 */

const ADDED = "2026-10-01T09:00:00.000Z";
const id = (label: string) => `srv_${label}_${"0".repeat(36 - label.length)}`;
const PAIRED_ROW = { nodeId: id("paired"), name: "docker", baseUrl: "http://localhost:8001", addedAt: ADDED, peerSecret: "c2VjcmV0LXBhaXJlZA" };
const UNPAIRED_ROW = { nodeId: id("unpaired"), name: "nas", baseUrl: "http://host.docker.internal:8003", addedAt: ADDED };
const SANDBOX_ROW = { nodeId: id("sandbox"), name: "sbx_0a1b2c3d4e", baseUrl: "http://127.0.0.1:47581", addedAt: ADDED, peerSecret: "c2VjcmV0LXNhbmRib3g", role: "sandbox" };
const NULL_ROLE_ROW = { nodeId: id("nullrole"), name: "linux-box", baseUrl: "http://100.64.0.7:8000", addedAt: ADDED, peerSecret: "c2VjcmV0LW51bGw", role: null };
const FOUNDER_LIKE = [
  { nodeId: id("docka"), name: "docker-a", baseUrl: "http://localhost:18001", addedAt: ADDED, peerSecret: "c2VjcmV0LWE" },
  { nodeId: id("dockb"), name: "docker-b", baseUrl: "http://localhost:18003", addedAt: ADDED, peerSecret: "c2VjcmV0LWI" },
  { nodeId: id("linux"), name: "linux-box", baseUrl: "http://100.64.0.9:8000", addedAt: ADDED, peerSecret: "c2VjcmV0LWM" },
];
const ENV = [
  "# AutoByteus settings",
  "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695",
  "ENABLE_REMOTE_COLLABORATION=true",
  "ENABLE_APPLICATIONS=false",
  "",
].join("\n");

let appDataDir: string;
const peersFile = () => path.join(appDataDir, "remote-collaboration", "peers.json");
const envFile = () => path.join(appDataDir, ".env");
const writeReleasedPeers = async (rows: unknown[], raw?: string) => {
  await fs.mkdir(path.dirname(peersFile()), { recursive: true });
  await fs.writeFile(peersFile(), raw ?? `${JSON.stringify({ peers: rows }, null, 2)}\n`, { mode: 0o600 });
};
const run = () => new PeersToNodeKeysMigration(appDataDir).execute();
const readPeers = async () => JSON.parse(await fs.readFile(peersFile(), "utf8")) as { peers: Record<string, unknown>[] };

beforeEach(async () => { appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-661-migration-")); });
afterEach(async () => { await fs.rm(appDataDir, { recursive: true, force: true }); });

describe("PeersToNodeKeysMigration (20261127_peers_to_node_keys)", () => {
  it("is registered last and runs on startup without holding back anything (no lockout: the rest of the node works)", () => {
    const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);
    expect(ids.at(-1)).toBe(PEERS_TO_NODE_KEYS_MIGRATION_ID);
    const migration = new PeersToNodeKeysMigration("/unused");
    expect(migration.requiredOnStartup).toBe(true);
    expect((migration as { holdsBackCapabilities?: unknown }).holdsBackCapabilities).toBeUndefined();
  });

  it("converts every released row shape: baseUrl → address, peerSecret dropped, role sandbox → sandbox: true; mode 0600 kept", async () => {
    await writeReleasedPeers([PAIRED_ROW, UNPAIRED_ROW, SANDBOX_ROW, NULL_ROLE_ROW]);
    const result = await run();
    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details).toEqual([
      expect.objectContaining({ itemId: "remote-collaboration/peers", status: "MIGRATED" }),
      expect.objectContaining({ itemId: "env/ENABLE_REMOTE_COLLABORATION", status: "SKIPPED" }),
    ]);
    expect(await readPeers()).toEqual({ peers: [
      { nodeId: PAIRED_ROW.nodeId, name: "docker", address: "http://localhost:8001", addedAt: ADDED },
      { nodeId: UNPAIRED_ROW.nodeId, name: "nas", address: "http://host.docker.internal:8003", addedAt: ADDED },
      { nodeId: SANDBOX_ROW.nodeId, name: "sbx_0a1b2c3d4e", address: "http://127.0.0.1:47581", addedAt: ADDED, sandbox: true },
      { nodeId: NULL_ROLE_ROW.nodeId, name: "linux-box", address: "http://100.64.0.7:8000", addedAt: ADDED },
    ] });
    const text = await fs.readFile(peersFile(), "utf8");
    expect(text).not.toContain("c2VjcmV0");
    if (process.platform !== "win32") expect((await fs.stat(peersFile())).mode & 0o777).toBe(0o600);
    // No backup and no temporary file is left next to it (the secrets are retired, D-3).
    expect(await fs.readdir(path.dirname(peersFile()))).toEqual(["peers.json"]);
  });

  it("AC-011 data like the founder's: 3 peers listed with Pair again, no secret anywhere, the switch deleted, other settings byte-identical", async () => {
    await writeReleasedPeers(FOUNDER_LIKE);
    await fs.writeFile(envFile(), ENV, { mode: 0o644 });
    const result = await run();
    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ migratedCount: 2, failedCount: 0 });
    expect(await fs.readFile(envFile(), "utf8")).toBe(ENV.replace("ENABLE_REMOTE_COLLABORATION=true\n", ""));
    if (process.platform !== "win32") expect((await fs.stat(envFile())).mode & 0o777).toBe(0o644);
    // The current runtime reads the result: every pair listed, none paired (Pair again), no key.
    const directory = new PeerDirectory({ store: new PeerStore({ getAppDataDir: () => appDataDir }), probe: { fetchNodeId: async () => "" },
      ownNodeId: async () => id("self"), runsInContainer: () => false });
    const listed = await directory.list();
    expect(listed.map((peer) => [peer.name, peer.address, peer.paired, peer.relation])).toEqual([
      ["docker-a", "http://localhost:18001", false, null], ["docker-b", "http://localhost:18003", false, null], ["linux-box", "http://100.64.0.9:8000", false, null]]);
    await expect(directory.peerKey(id("docka"))).resolves.toEqual({ publicKey: null, machine: null });
  });

  it("removes only the switch's assignment lines (export form, CRLF endings, no final newline), every other byte unchanged", async () => {
    const crlf = "# keep\r\nexport ENABLE_REMOTE_COLLABORATION=false\r\nOTHER=1\r\nENABLE_REMOTE_COLLABORATION_NOTE=keep\r\n  ENABLE_REMOTE_COLLABORATION = true";
    await fs.writeFile(envFile(), crlf);
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(await fs.readFile(envFile(), "utf8")).toBe("# keep\r\nOTHER=1\r\nENABLE_REMOTE_COLLABORATION_NOTE=keep\r\n");
  });

  it("is idempotent: a second run skips both items and changes no byte", async () => {
    await writeReleasedPeers(FOUNDER_LIKE);
    await fs.writeFile(envFile(), ENV);
    await run();
    const [peers, env] = await Promise.all([fs.readFile(peersFile(), "utf8"), fs.readFile(envFile(), "utf8")]);
    const again = await run();
    expect(again.status).toBe("SUCCEEDED");
    expect(again.summary).toMatchObject({ migratedCount: 0, skippedCount: 2 });
    expect(await fs.readFile(peersFile(), "utf8")).toBe(peers);
    expect(await fs.readFile(envFile(), "utf8")).toBe(env);
  });

  it("keeps current rows (written by the new runtime) next to converted ones", async () => {
    const current = { nodeId: id("current"), name: "bob-laptop", publicKey: "MCowBQYDK2VwAyEA", address: "http://192.168.1.20:8000",
      machine: null, account: null, relation: "teammate", addedAt: ADDED };
    await writeReleasedPeers([current, PAIRED_ROW]);
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect((await readPeers()).peers).toEqual([current, { nodeId: PAIRED_ROW.nodeId, name: "docker", address: "http://localhost:8001", addedAt: ADDED }]);
  });

  it("a row in no known shape, or a file that is not JSON, fails that item and leaves the file byte-identical; the .env still migrates", async () => {
    await writeReleasedPeers([PAIRED_ROW, { ...UNPAIRED_ROW, role: "admin" }]);
    await fs.writeFile(envFile(), ENV);
    const before = await fs.readFile(peersFile(), "utf8");
    const result = await run();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details[0]).toMatchObject({ status: "FAILED", message: expect.stringContaining("row 1") });
    expect(await fs.readFile(peersFile(), "utf8")).toBe(before);
    expect(await fs.readFile(envFile(), "utf8")).not.toContain("ENABLE_REMOTE_COLLABORATION");
    // The current reader refuses the unconverted file: peers are refused, nothing else depends on it.
    await expect(new PeerStore({ getAppDataDir: () => appDataDir }).read()).rejects.toThrow();

    await writeReleasedPeers([], "{ not json");
    await expect(run()).resolves.toMatchObject({ summary: { details: [expect.objectContaining({ status: "FAILED" }), expect.anything()] } });
    expect(await fs.readFile(peersFile(), "utf8")).toBe("{ not json");
  });

  it("with neither file there is nothing to do", async () => {
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, skippedCount: 2, failedCount: 0 } });
  });
});
