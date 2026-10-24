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

  it("registers the named node by URL and name, checking that the URL answers with it, in peers.json with exact keys", async () => {
    const f = await directory();
    await expect(f.peers.add({ nodeId: B, baseUrl: "localhost:29700/rest", name: "docker" })).resolves.toEqual({
      nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" });
    expect(f.probe.fetchNodeId).toHaveBeenCalledWith("http://localhost:29700");
    expect(await readJson(path.join(f.dir, "remote-collaboration", "peers.json"))).toEqual({ peers: [
      { nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" }] });
    await expect(f.peers.findByName("DOCKER")).resolves.toMatchObject({ nodeId: B });
    await expect(f.peers.findByNodeId(B)).resolves.toMatchObject({ name: "docker" });
  });

  it("one-nodes-tab: refuses a URL that answers with a different node than the one named (PEER_IDENTITY_MISMATCH)", async () => {
    const f = await directory({ identity: "srv_someone_else_000000000000000000000" });
    await expect(f.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" })).rejects.toMatchObject({
      code: "PEER_IDENTITY_MISMATCH", details: { address: "http://b" } });
    expect(await f.peers.list()).toEqual([]);
  });

  it("refuses to contact a URL while the switch is off, a URL that is this node, a node registered twice and a taken name", async () => {
    const off = await directory({ enabled: false });
    await expect(off.peers.add({ nodeId: B, baseUrl: "http://b", name: "b" })).rejects.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
    expect(off.probe.fetchNodeId).not.toHaveBeenCalled();
    const self = await directory({ identity: SELF });
    await expect(self.peers.add({ nodeId: SELF, baseUrl: "http://me", name: "me" })).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    const f = await directory();
    await f.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" });
    await expect(f.peers.add({ nodeId: B, baseUrl: "http://b-again", name: "other" })).rejects.toMatchObject({ code: "PEER_ALREADY_REGISTERED" });
    await expect(f.peers.add({ nodeId: B, baseUrl: "http://c", name: "Docker" })).rejects.toMatchObject({ code: "PEER_NAME_TAKEN" });
    await expect(f.peers.add({ nodeId: B, baseUrl: "http://c", name: "/bad" })).rejects.toMatchObject({ code: "PEER_NAME_INVALID" });
    expect((await f.peers.list()).length).toBe(1);
  });

  it("renames (the name only) and removes a peer", async () => {
    const f = await directory();
    await f.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" });
    await expect(f.peers.rename(B, "nas")).resolves.toMatchObject({ nodeId: B, name: "nas", baseUrl: "http://b" });
    await expect(f.peers.findByName("docker")).resolves.toBeNull();
    await f.peers.remove(B);
    expect(await f.peers.list()).toEqual([]);
    await expect(f.peers.remove(B)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });

  it("one-nodes-tab TR-711: changes a peer's address only when the pinned node answers there, with the switch on", async () => {
    const f = await directory();
    await f.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" });
    await expect(f.peers.changeAddress(B, "host.docker.internal:8001")).resolves.toMatchObject({
      nodeId: B, name: "docker", baseUrl: "http://host.docker.internal:8001", addedAt: "2026-10-20T09:00:00.000Z" });
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
    await docker.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" });
    await expect(docker.peers.changeAddress(B, "http://127.0.0.1:29695")).rejects.toMatchObject({
      code: "PEER_UNREACHABLE", details: { reason: "refused", address: "http://127.0.0.1:29695", loopbackInContainer: true } });
    await expect(docker.peers.changeAddress(B, "http://192.168.2.10:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
    const host = await directory({ inContainer: false, probe: unreachable });
    await host.peers.add({ nodeId: B, baseUrl: "http://b", name: "docker" });
    await expect(host.peers.changeAddress(B, "http://localhost:29695")).rejects.toMatchObject({ details: { loopbackInContainer: false } });
  });
});
