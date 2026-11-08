import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";

describe("PeerStore (peers.json)", () => {
  let dataDir: string;
  let store: PeerStore;
  const addedAt = "2026-11-08T10:00:00.000Z";

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-store-"));
    store = new PeerStore({ getAppDataDir: () => dataDir });
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("NAS-23 keeps a peer paired before this model as unpaired (no secret) through a read and a later write", async () => {
    await fs.mkdir(path.join(dataDir, "remote-collaboration"), { recursive: true });
    await fs.writeFile(store.filePath(), JSON.stringify({ peers: [
      { nodeId: "srv_legacy", name: "legacy", baseUrl: "http://127.0.0.1:9", addedAt },
      { nodeId: "srv_paired", name: "paired", baseUrl: "http://127.0.0.1:9", addedAt, peerSecret: "secret-value" },
    ] }));

    const peers = await store.read();
    expect(peers.map((peer) => peer.peerSecret)).toEqual([null, "secret-value"]);

    // The node writes the list back (a rename, a removal): the unpaired row stays without a secret key.
    await store.write(peers.filter((peer) => peer.nodeId !== "srv_paired"));
    expect(JSON.parse(await fs.readFile(store.filePath(), "utf8"))).toEqual({ peers: [
      { nodeId: "srv_legacy", name: "legacy", baseUrl: "http://127.0.0.1:9", addedAt },
    ] });
    if (process.platform !== "win32") expect((await fs.stat(store.filePath())).mode & 0o777).toBe(0o600);
  });
});
