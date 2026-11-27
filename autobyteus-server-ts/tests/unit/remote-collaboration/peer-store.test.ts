import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";

/** autobyteus-661 contract §1: peers.json read tolerantly (known fields), written exactly, mode 0600. */
describe("PeerStore (peers.json)", () => {
  let dataDir: string;
  let store: PeerStore;
  const addedAt = "2026-11-08T10:00:00.000Z";

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-store-"));
    store = new PeerStore({ getAppDataDir: () => dataDir });
    await fs.mkdir(path.join(dataDir, "remote-collaboration"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("NAS-23 reads a migrated row (no key) and a current row; unknown fields are dropped and absent ones written as null", async () => {
    await fs.writeFile(store.filePath(), JSON.stringify({ peers: [
      { nodeId: "srv_legacy", name: "legacy", address: "http://127.0.0.1:9", addedAt, sandbox: true },
      { nodeId: "srv_paired", name: "paired", publicKey: "MCowBQYDK2VwAyEA", address: "http://127.0.0.1:9", machine: null, account: null,
        relation: "teammate", addedAt, note: "left by a newer build" },
    ] }));

    const peers = await store.read();
    expect(peers.map((peer) => [peer.publicKey, peer.relation, peer.sandbox])).toEqual([[null, null, true], ["MCowBQYDK2VwAyEA", "teammate", false]]);

    await store.write(peers);
    expect(JSON.parse(await fs.readFile(store.filePath(), "utf8"))).toEqual({ peers: [
      { nodeId: "srv_legacy", name: "legacy", publicKey: null, address: "http://127.0.0.1:9", machine: null, account: null, relation: null, sandbox: true, addedAt },
      { nodeId: "srv_paired", name: "paired", publicKey: "MCowBQYDK2VwAyEA", address: "http://127.0.0.1:9", machine: null, account: null, relation: "teammate", addedAt },
    ] });
    if (process.platform !== "win32") expect((await fs.stat(store.filePath())).mode & 0o777).toBe(0o600);
  });

  it("reads only the current shape: a released row (baseUrl, peerSecret) is not read, and an unknown relation is refused", async () => {
    await fs.writeFile(store.filePath(), JSON.stringify({ peers: [
      { nodeId: "srv_old", name: "old", baseUrl: "http://127.0.0.1:9", addedAt, peerSecret: "s" }] }));
    await expect(store.read()).rejects.toThrow("address");
    await fs.writeFile(store.filePath(), JSON.stringify({ peers: [
      { nodeId: "srv_x", name: "x", address: "http://127.0.0.1:9", addedAt, relation: "admin" }] }));
    await expect(store.read()).rejects.toThrow("relation");
  });

  it("a missing file has no peers", async () => {
    await expect(store.read()).resolves.toEqual([]);
  });
});
