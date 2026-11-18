import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";
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
  const directory = async (input: { enabled?: boolean; identity?: string; inContainer?: boolean; probe?: (url: string) => Promise<string> } = {}) => {
    const dir = await dataDir();
    const store = new PeerStore({ getAppDataDir: () => dir });
    const probe = { fetchNodeId: vi.fn(input.probe ?? (async () => input.identity ?? B)) };
    const peers = new PeerDirectory({ store, probe, capability: { isEnabled: () => input.enabled ?? true },
      ownNodeId: async () => SELF, runsInContainer: () => input.inContainer ?? false, now: () => new Date("2026-10-20T09:00:00.000Z") });
    return { dir, store, probe, peers };
  };

  const SECRET = "peer-secret-for-tests";

  it("NAS-19 saves a paired peer with its secret in peers.json (mode 0600, exact keys); lists it as paired, never with the secret", async () => {
    const f = await directory();
    await expect(f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://localhost:29700", name: "docker", peerSecret: SECRET })).resolves.toEqual({
      nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z", paired: true });
    const file = path.join(f.dir, "remote-collaboration", "peers.json");
    expect(await readJson(file)).toEqual({ peers: [
      { nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z", peerSecret: SECRET }] });
    if (process.platform !== "win32") expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(await f.peers.list())).not.toContain(SECRET);
    await expect(f.peers.findByName("DOCKER")).resolves.toMatchObject({ nodeId: B, paired: true });
    await expect(f.peers.peerSecret(B)).resolves.toBe(SECRET);
  });

  it("NAS-23 a peer registered before peers paired reads as unpaired; pairing it keeps its name and history and sets address and secret", async () => {
    const f = await directory();
    await fs.mkdir(path.join(f.dir, "remote-collaboration"), { recursive: true });
    await fs.writeFile(path.join(f.dir, "remote-collaboration", "peers.json"), JSON.stringify({ peers: [
      { nodeId: B, name: "nas", baseUrl: "http://localhost:8001", addedAt: "2026-10-01T09:00:00.000Z" }] }));
    await expect(f.peers.list()).resolves.toEqual([{ nodeId: B, name: "nas", baseUrl: "http://localhost:8001", addedAt: "2026-10-01T09:00:00.000Z", paired: false }]);
    await expect(f.peers.peerSecret(B)).resolves.toBeNull();
    await expect(f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://host.docker.internal:8001", name: "other", peerSecret: SECRET }))
      .resolves.toEqual({ nodeId: B, name: "nas", baseUrl: "http://host.docker.internal:8001", addedAt: "2026-10-01T09:00:00.000Z", paired: true });
  });

  it("refuses pairing this node itself and a peer that is already paired; a wanted name is made valid and unique", async () => {
    const f = await directory();
    await expect(f.peers.assertPairable(SELF)).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    await f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: SECRET });
    await expect(f.peers.assertPairable(B)).rejects.toMatchObject({ code: "PEER_ALREADY_REGISTERED" });
    await expect(f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: "another" }))
      .rejects.toMatchObject({ code: "PEER_ALREADY_REGISTERED" });
    const C = "srv_peer_c_00000000000000000000000000";
    await expect(f.peers.savePairedPeer({ nodeId: C, baseUrl: "http://c", name: "Docker", peerSecret: SECRET })).resolves.toMatchObject({ name: "Docker 2" });
    const D = "srv_peer_d_00000000000000000000000000";
    await expect(f.peers.savePairedPeer({ nodeId: D, baseUrl: "http://d", name: "/MacBook Pro (2)", peerSecret: SECRET })).resolves.toMatchObject({ name: "MacBook Pro -2-" });
  });

  it("renames (the name only); removing a peer forgets its secret and publishes the revocation that closes its sockets (NA-11)", async () => {
    const f = await directory();
    const revoked = vi.fn();
    f.peers.onClientRevoked(revoked);
    await f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: SECRET });
    await expect(f.peers.rename(B, "nas")).resolves.toMatchObject({ nodeId: B, name: "nas", baseUrl: "http://b" });
    await expect(f.peers.findByName("docker")).resolves.toBeNull();
    await f.peers.remove(B);
    expect(await f.peers.list()).toEqual([]);
    await expect(f.peers.peerSecret(B)).resolves.toBeNull();
    expect(revoked).toHaveBeenCalledWith(expect.objectContaining({ kind: "peer", id: B, refusal: expect.objectContaining({ code: "PEER_UNPAIRED" }) }));
    await expect(f.peers.remove(B)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });

  it("one-nodes-tab TR-711: changes a peer's address only when the pinned node answers there, with the switch on", async () => {
    const f = await directory();
    await f.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: SECRET });
    await expect(f.peers.changeAddress(B, "host.docker.internal:8001")).resolves.toMatchObject({
      nodeId: B, name: "docker", baseUrl: "http://host.docker.internal:8001", addedAt: "2026-10-20T09:00:00.000Z", paired: true });
    expect((await readJson(path.join(f.dir, "remote-collaboration", "peers.json"))).peers[0].baseUrl).toBe("http://host.docker.internal:8001");
    f.probe.fetchNodeId.mockResolvedValueOnce("srv_someone_else_000000000000000000000");
    await expect(f.peers.changeAddress(B, "http://wrong")).rejects.toMatchObject({ code: "PEER_IDENTITY_MISMATCH" });
    await expect(f.peers.changeAddress("srv_unknown", "http://b")).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
    expect((await f.peers.list())[0]!.baseUrl).toBe("http://host.docker.internal:8001");
    const off = await directory({ enabled: false });
    await expect(off.peers.changeAddress(B, "http://b")).rejects.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
  });

  it("one-nodes-tab REQ-708: an unreachable loopback address says loopbackInContainer only when this node runs in a container", async () => {
    const unreachable = async (url: string) => {
      if (url === "http://b") return B;
      throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${url} could not be reached`, { reason: "refused", address: url });
    };
    const docker = await directory({ inContainer: true, probe: unreachable });
    await docker.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: SECRET });
    await expect(docker.peers.changeAddress(B, "http://127.0.0.1:29695")).rejects.toMatchObject({
      code: "PEER_UNREACHABLE", details: { reason: "refused", address: "http://127.0.0.1:29695", loopbackInContainer: true } });
    await expect(docker.peers.changeAddress(B, "http://192.168.2.10:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
    const host = await directory({ inContainer: false, probe: unreachable });
    await host.peers.savePairedPeer({ nodeId: B, baseUrl: "http://b", name: "docker", peerSecret: SECRET });
    await expect(host.peers.changeAddress(B, "http://localhost:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
  });
});
