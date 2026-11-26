/**
 * autobyteus-581 C11: the `sandbox` lifecycle mark. The invite this node creates for a sandbox carries the role beside
 * its code's hash in memory (never in the invite text); the pairing exchange saves the peer with it in one write (R-H);
 * `peers.json` keeps it and an older row without one reads as a normal peer (Directly Usable, no migration).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { decodePeerInvite, PeerPairingService } from "../../../src/remote-collaboration/settings/peer-pairing-service.js";

const HOST = "srv_host_000000000000000000000000000000000";
const SANDBOX = "srv_sandbox_0000000000000000000000000000000";
const DESKTOP = "srv_desktop_0000000000000000000000000000000";

let dir = "";
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "peer-role-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

const compose = () => {
  const store = new PeerStore({ getAppDataDir: () => dir });
  const peers = new PeerDirectory({
    store, probe: { fetchNodeId: async () => SANDBOX }, capability: { isEnabled: () => true },
    ownNodeId: async () => HOST, runsInContainer: () => false,
  });
  const pairing = new PeerPairingService({
    capability: { isEnabled: () => true }, peers,
    addresses: { resolve: async (_nodeId: string, candidates: readonly string[]) => candidates[0]! },
    transport: { exchangePeerInvite: async () => { throw new Error("unused"); } },
    ownNodeId: async () => HOST, ownAddressCandidates: () => ["http://host.docker.internal:8000"], ownName: async () => "host",
  });
  return { store, peers, pairing };
};

describe("the sandbox mark (C11)", () => {
  it("NAS-46 is kept with the invite, never in its text, and saved with the peer by the exchange (R-H)", async () => {
    const { peers, pairing, store } = compose();
    const invite = await pairing.createInvite({ role: "sandbox" });
    expect(JSON.stringify(decodePeerInvite(invite.inviteText))).not.toContain("sandbox");
    const answer = await pairing.exchange({ inviteCode: invite.invite.inviteCode, fromNodeId: SANDBOX, fromName: "sbx_0a1b2c3d4e", addressCandidates: ["http://127.0.0.1:47581"] });
    expect(answer).toMatchObject({ nodeId: HOST });
    expect(await peers.findByNodeId(SANDBOX)).toMatchObject({ name: "sbx_0a1b2c3d4e", paired: true, role: "sandbox" });
    const stored = JSON.parse(fs.readFileSync(store.filePath(), "utf8")) as { peers: Array<Record<string, unknown>> };
    expect(stored.peers[0]).toMatchObject({ nodeId: SANDBOX, role: "sandbox" });
  });

  it("an ordinary invite saves a normal peer, without a role key on disk", async () => {
    const { peers, pairing, store } = compose();
    const invite = await pairing.createInvite();
    await pairing.exchange({ inviteCode: invite.invite.inviteCode, fromNodeId: DESKTOP, fromName: "desktop", addressCandidates: ["http://10.0.0.2:8000"] });
    expect(await peers.findByNodeId(DESKTOP)).toMatchObject({ role: null });
    expect(JSON.parse(fs.readFileSync(store.filePath(), "utf8")).peers[0]).not.toHaveProperty("role");
  });

  it("reads a row written before roles existed as a normal peer, and refuses an unknown role", async () => {
    const { store } = compose();
    fs.mkdirSync(path.dirname(store.filePath()), { recursive: true });
    fs.writeFileSync(store.filePath(), JSON.stringify({ peers: [{ nodeId: DESKTOP, name: "desktop", baseUrl: "http://x", addedAt: "2026-10-01T00:00:00.000Z", peerSecret: "s" }] }));
    expect((await store.read())[0]).toMatchObject({ nodeId: DESKTOP, role: null });
    fs.writeFileSync(store.filePath(), JSON.stringify({ peers: [{ nodeId: DESKTOP, name: "desktop", baseUrl: "http://x", addedAt: "2026-10-01T00:00:00.000Z", role: "admin" }] }));
    await expect(store.read()).rejects.toThrow("role");
  });
});
