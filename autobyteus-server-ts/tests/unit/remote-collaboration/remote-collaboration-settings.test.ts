import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { RemoteCollaborationCapability } from "../../../src/remote-collaboration/settings/remote-collaboration-capability.js";

/** Design § On-Disk Data Model files 1–2 (the switch and the peers); REQ-101, REQ-102 (DS-004). */

const SELF = "srv_self_node_000000000000000000000000";
const B = "srv_peer_b_00000000000000000000000000";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const dataDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-collab-settings-")); roots.push(dir);
  return dir;
};
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

describe("RemoteCollaborationCapability (the switch)", () => {
  it("is off unless ENABLE_REMOTE_COLLABORATION is true, and is written through the settings mechanism", () => {
    const values = new Map<string, boolean>();
    const capability = new RemoteCollaborationCapability({
      getBooleanSetting: (key) => values.get(key) ?? null,
      setBooleanSetting: (key, value) => { values.set(key, value); },
    });
    expect(capability.getState()).toEqual({ enabled: false, settingKey: "ENABLE_REMOTE_COLLABORATION", source: "DEFAULT_DISABLED" });
    capability.setEnabled(true);
    expect(values.get("ENABLE_REMOTE_COLLABORATION")).toBe(true);
    expect(capability.isEnabled()).toBe(true);
    expect(capability.getState().source).toBe("SERVER_SETTING");
  });
});

describe("PeerDirectory", () => {
  const directory = async (input: { enabled?: boolean; identity?: string } = {}) => {
    const dir = await dataDir();
    const store = new PeerStore({ getAppDataDir: () => dir });
    const probe = { fetchServerInstanceId: vi.fn(async () => input.identity ?? B) };
    const peers = new PeerDirectory({ store, probe, capability: { isEnabled: () => input.enabled ?? true },
      ownNodeId: async () => SELF, now: () => new Date("2026-10-20T09:00:00.000Z") });
    return { dir, store, probe, peers };
  };

  it("registers a peer by URL and name, pinning the identity behind the URL, in peers.json with exact keys", async () => {
    const f = await directory();
    await expect(f.peers.add({ baseUrl: "localhost:29700/rest", name: "docker" })).resolves.toEqual({
      nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" });
    expect(f.probe.fetchServerInstanceId).toHaveBeenCalledWith("http://localhost:29700");
    expect(await readJson(path.join(f.dir, "remote-collaboration", "peers.json"))).toEqual({ peers: [
      { nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" }] });
    await expect(f.peers.findByName("DOCKER")).resolves.toMatchObject({ nodeId: B });
    await expect(f.peers.findByNodeId(B)).resolves.toMatchObject({ name: "docker" });
  });

  it("refuses to contact a URL while the switch is off, a URL that is this node, a node registered twice and a taken name", async () => {
    const off = await directory({ enabled: false });
    await expect(off.peers.add({ baseUrl: "http://b", name: "b" })).rejects.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
    expect(off.probe.fetchServerInstanceId).not.toHaveBeenCalled();
    const self = await directory({ identity: SELF });
    await expect(self.peers.add({ baseUrl: "http://me", name: "me" })).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    const f = await directory();
    await f.peers.add({ baseUrl: "http://b", name: "docker" });
    await expect(f.peers.add({ baseUrl: "http://b-again", name: "other" })).rejects.toMatchObject({ code: "PEER_ALREADY_REGISTERED" });
    await expect(f.peers.add({ baseUrl: "http://c", name: "Docker" })).rejects.toMatchObject({ code: "PEER_NAME_TAKEN" });
    await expect(f.peers.add({ baseUrl: "http://c", name: "/bad" })).rejects.toMatchObject({ code: "PEER_NAME_INVALID" });
    expect((await f.peers.list()).length).toBe(1);
  });

  it("renames (the name only) and removes a peer", async () => {
    const f = await directory();
    await f.peers.add({ baseUrl: "http://b", name: "docker" });
    await expect(f.peers.rename(B, "nas")).resolves.toMatchObject({ nodeId: B, name: "nas", baseUrl: "http://b" });
    await expect(f.peers.findByName("docker")).resolves.toBeNull();
    await f.peers.remove(B);
    expect(await f.peers.list()).toEqual([]);
    await expect(f.peers.remove(B)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });
});
