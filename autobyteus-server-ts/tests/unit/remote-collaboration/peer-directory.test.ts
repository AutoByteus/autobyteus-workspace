import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";
import { testNodeKey } from "../../helpers/peer-node-keys.js";

/** autobyteus-661 contract §1: the peers of this node (DS-004), their records in peers.json, and the "Pair again" state. */

const SELF = "srv_self_node_000000000000000000000000";
const B = "srv_peer_b_00000000000000000000000000";
const KEY_B = testNodeKey().publicKeyText;
const T0 = "2026-10-20T09:00:00.000Z";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

const directory = async (input: { identity?: string; inContainer?: boolean; probe?: (address: string) => Promise<string> } = {}) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-directory-")); roots.push(dir);
  const store = new PeerStore({ getAppDataDir: () => dir });
  const probe = { fetchNodeId: vi.fn(input.probe ?? (async () => input.identity ?? B)) };
  const peers = new PeerDirectory({ store, probe, ownNodeId: async () => SELF, runsInContainer: () => input.inContainer ?? false, now: () => new Date(T0) });
  return { dir, file: path.join(dir, "remote-collaboration", "peers.json"), probe, peers };
};
const paired = (overrides: Partial<Parameters<PeerDirectory["savePairedPeer"]>[0]> = {}) => ({
  nodeId: B, name: "docker", publicKey: KEY_B, address: "http://localhost:29700", machine: null, account: null, relation: "own" as const, ...overrides,
});

describe("PeerDirectory", () => {
  it("NAS-19 saves a pair in peers.json (mode 0600, exact keys: contract §1); lists it as paired, never with its key", async () => {
    const f = await directory();
    await expect(f.peers.savePairedPeer(paired())).resolves.toEqual({
      nodeId: B, name: "docker", address: "http://localhost:29700", machine: null, account: null, relation: "own" as const, sandbox: false, addedAt: T0, paired: true });
    expect(await readJson(f.file)).toEqual({ peers: [
      { nodeId: B, name: "docker", publicKey: KEY_B, address: "http://localhost:29700", machine: null, account: null, relation: "own", addedAt: T0 }] });
    if (process.platform !== "win32") expect((await fs.stat(f.file)).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(await f.peers.list())).not.toContain(KEY_B);
    await expect(f.peers.findByName("DOCKER")).resolves.toMatchObject({ nodeId: B, paired: true });
    await expect(f.peers.peerKey(B)).resolves.toEqual({ publicKey: KEY_B, machine: null });
    await expect(f.peers.peerKey("srv_unknown")).resolves.toBeNull();
  });

  it("NAS-46 a sandbox's record carries `sandbox: true` on disk; a private-network pair keeps its machine and account", async () => {
    const f = await directory();
    await f.peers.savePairedPeer(paired({ name: "sbx_0a1b2c3d4e", sandbox: true }));
    expect((await readJson(f.file)).peers[0]).toMatchObject({ sandbox: true, relation: "own" });
    const C = "srv_peer_c_00000000000000000000000000";
    await expect(f.peers.savePairedPeer(paired({ nodeId: C, name: "bob-laptop", machine: "nKxQ7-stable", account: "bob@example.com", relation: "teammate" })))
      .resolves.toMatchObject({ machine: "nKxQ7-stable", account: "bob@example.com", relation: "teammate", sandbox: false });
    await expect(f.peers.peerKey(C)).resolves.toEqual({ publicKey: KEY_B, machine: "nKxQ7-stable" });
    expect((await readJson(f.file)).peers[1]).not.toHaveProperty("sandbox");
  });

  it("NAS-23 a pair made before node keys reads as not paired (Pair again); pairing again keeps its name and mark and sets key, address and relation", async () => {
    const f = await directory();
    await fs.mkdir(path.dirname(f.file), { recursive: true });
    // The migration's row (20261127_peers_to_node_keys): no key, no machine, no relation.
    await fs.writeFile(f.file, JSON.stringify({ peers: [{ nodeId: B, name: "nas", address: "http://localhost:8001", addedAt: "2026-10-01T09:00:00.000Z", sandbox: true }] }));
    await expect(f.peers.list()).resolves.toEqual([{ nodeId: B, name: "nas", address: "http://localhost:8001", machine: null, account: null, relation: null,
      sandbox: true, addedAt: "2026-10-01T09:00:00.000Z", paired: false }]);
    await expect(f.peers.peerKey(B)).resolves.toEqual({ publicKey: null, machine: null });
    await expect(f.peers.savePairedPeer(paired({ address: "http://host.docker.internal:8001", name: "other" })))
      .resolves.toEqual({ nodeId: B, name: "nas", address: "http://host.docker.internal:8001", machine: null, account: null, relation: "own" as const, sandbox: true, addedAt: T0, paired: true });
  });

  it("NAS-53 CR-001 never replaces a held key: another key for a paired node is PEER_KEY_CONFLICT; the same key renews the record", async () => {
    const f = await directory();
    await f.peers.savePairedPeer(paired());
    await expect(f.peers.savePairedPeer(paired({ publicKey: testNodeKey().publicKeyText }))).rejects.toMatchObject({ code: "PEER_KEY_CONFLICT" });
    await expect(f.peers.peerKey(B)).resolves.toEqual({ publicKey: KEY_B, machine: null });
    await expect(f.peers.savePairedPeer(paired({ machine: "machine-new", account: "ryan@example.com" }))).resolves.toMatchObject({ machine: "machine-new", name: "docker" });
  });

  it("refuses pairing this node itself; a wanted name is made valid and unique", async () => {
    const f = await directory();
    await expect(f.peers.assertPairable(SELF)).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    await expect(f.peers.assertPairable(B)).resolves.toBeUndefined();
    await f.peers.savePairedPeer(paired());
    const C = "srv_peer_c_00000000000000000000000000";
    await expect(f.peers.savePairedPeer(paired({ nodeId: C, name: "Docker" }))).resolves.toMatchObject({ name: "Docker 2" });
    const D = "srv_peer_d_00000000000000000000000000";
    await expect(f.peers.savePairedPeer(paired({ nodeId: D, name: "/MacBook Pro (2)" }))).resolves.toMatchObject({ name: "MacBook Pro -2-" });
  });

  it("renames (the name only); removing a peer forgets its key and publishes the revocation that closes its sockets (NA-11)", async () => {
    const f = await directory();
    const revoked = vi.fn();
    f.peers.onClientRevoked(revoked);
    await f.peers.savePairedPeer(paired({ address: "http://b" }));
    await expect(f.peers.rename(B, "nas")).resolves.toMatchObject({ nodeId: B, name: "nas", address: "http://b" });
    await expect(f.peers.findByName("docker")).resolves.toBeNull();
    await f.peers.remove(B);
    expect(await f.peers.list()).toEqual([]);
    await expect(f.peers.peerKey(B)).resolves.toBeNull();
    expect(revoked).toHaveBeenCalledWith(expect.objectContaining({ kind: "peer", id: B, refusal: expect.objectContaining({ code: "PEER_UNPAIRED" }) }));
    await expect(f.peers.remove(B)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });

  it("one-nodes-tab TR-711: changes a plain-address peer's address only when the same node answers there; a private-network peer's is fixed", async () => {
    const f = await directory();
    await f.peers.savePairedPeer(paired({ address: "http://b" }));
    await expect(f.peers.changeAddress(B, "host.docker.internal:8001")).resolves.toMatchObject({
      nodeId: B, name: "docker", address: "http://host.docker.internal:8001", paired: true });
    expect((await readJson(f.file)).peers[0].address).toBe("http://host.docker.internal:8001");
    f.probe.fetchNodeId.mockResolvedValueOnce("srv_someone_else_000000000000000000000");
    await expect(f.peers.changeAddress(B, "http://wrong")).rejects.toMatchObject({ code: "PEER_IDENTITY_MISMATCH" });
    await expect(f.peers.changeAddress("srv_unknown", "http://b")).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
    expect((await f.peers.list())[0]!.address).toBe("http://host.docker.internal:8001");
    const C = "srv_peer_c_00000000000000000000000000";
    await f.peers.savePairedPeer(paired({ nodeId: C, name: "laptop", machine: "machine-c", account: "ryan@example.com" }));
    await expect(f.peers.changeAddress(C, "http://c")).rejects.toMatchObject({ code: "PEER_ADDRESS_FIXED" });
  });

  it("one-nodes-tab REQ-708: an unreachable loopback address says loopbackInContainer only when this node runs in a container", async () => {
    const unreachable = async (address: string) => {
      if (address === "http://b") return B;
      throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${address} could not be reached`, { reason: "refused", address });
    };
    const docker = await directory({ inContainer: true, probe: unreachable });
    await docker.peers.savePairedPeer(paired({ address: "http://b" }));
    await expect(docker.peers.changeAddress(B, "http://127.0.0.1:29695")).rejects.toMatchObject({
      code: "PEER_UNREACHABLE", details: { reason: "refused", address: "http://127.0.0.1:29695", loopbackInContainer: true } });
    await expect(docker.peers.changeAddress(B, "http://192.168.2.10:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
    const host = await directory({ inContainer: false, probe: unreachable });
    await host.peers.savePairedPeer(paired({ address: "http://b" }));
    await expect(host.peers.changeAddress(B, "http://localhost:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
  });
});
