import { EventEmitter } from "node:events";
import type { ClientRevocationListener, ClientRevocationSource } from "../../node-access/domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";
import type { PeerVerificationKey } from "../channel/node-key-peer-verifier.js";
import type { PeerNode, PeerRelation } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import type { PeerStore, StoredPeer } from "./peer-store.js";

/** How the directory learns the server identity behind an address (`PeerClient`'s identity probe). */
export type PeerIdentityProbe = Readonly<{
  /** The node ID of the AutoByteus node at `address`; rejects with a settings error otherwise. */
  fetchNodeId(address: string): Promise<string>;
}>;

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/;
const NAME_MAX = 64;
const nameKey = (name: string): string => name.toLocaleLowerCase("en-US");
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Inside a container, a loopback address is the container itself (one-nodes-tab REQ-708, design § Loopback Hint
 * Surface): the Nodes page then explains it and suggests `host.docker.internal`.
 */
export const loopbackInContainer = (address: string, runsInContainer: () => boolean): boolean => {
  try { return LOOPBACK_HOSTS.has(new URL(address).hostname.toLowerCase()) && runsInContainer(); } catch { return false; }
};

const toPeerNode = (stored: StoredPeer): PeerNode => Object.freeze({
  nodeId: stored.nodeId,
  name: stored.name,
  address: stored.address,
  machine: stored.machine,
  account: stored.account,
  relation: stored.relation,
  sandbox: stored.sandbox,
  addedAt: stored.addedAt,
  paired: stored.publicKey !== null,
});

/** A valid peer name from any wanted text, unique among `taken` with " 2", " 3", … (the Nodes page's naming rule). */
const uniqueName = (wanted: string, taken: readonly string[]): string => {
  const valid = wanted.trim().replace(/[^A-Za-z0-9 _.-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "").slice(0, NAME_MAX).trimEnd() || "node";
  const used = new Set(taken.map(nameKey));
  if (!used.has(nameKey(valid))) return valid;
  for (let number = 2; ; number += 1) {
    const suffix = ` ${number}`;
    const candidate = `${valid.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`;
    if (!used.has(nameKey(candidate))) return candidate;
  }
};

/** A peer as pairing saves it (contract §1): its key, where this node reaches it, its machine, whose node it is. */
export type PairedPeerInput = Readonly<{
  nodeId: string;
  name: string;
  publicKey: string;
  address: string;
  machine: string | null;
  account: string | null;
  relation: PeerRelation;
  sandbox?: boolean;
}>;

/**
 * The peers of this node (DEC-101, REQ-102; autobyteus-661 contract §1): save a pair `PeerPairing` made, change a
 * peer's address (the same node must answer there), rename, remove, and lookup by name or node ID. The only reader and
 * writer of `peers.json`, read once and kept in memory (a peer request's signature check touches no file). Changes
 * are serialized. Removing a peer forgets its key and closes its open sockets (NA-11); run history is kept and links
 * naming it are then refused.
 */
export class PeerDirectory implements ClientRevocationSource {
  private tail: Promise<unknown> = Promise.resolve();
  private stored: readonly StoredPeer[] | null = null;
  private readonly events = new EventEmitter();

  constructor(private readonly dependencies: Readonly<{
    store: PeerStore;
    probe: PeerIdentityProbe;
    ownNodeId(): Promise<string>;
    runsInContainer(): boolean;
    now?(): Date;
  }>) {}

  async list(): Promise<readonly PeerNode[]> {
    return (await this.storedPeers()).map(toPeerNode);
  }

  /** What the verifier checks a request of `nodeId` with; `null` for a node that is not a peer here. */
  async peerKey(nodeId: string): Promise<PeerVerificationKey | null> {
    const peer = (await this.storedPeers()).find((entry) => entry.nodeId === nodeId);
    return peer ? Object.freeze({ publicKey: peer.publicKey, machine: peer.machine }) : null;
  }

  async findByName(name: string): Promise<PeerNode | null> {
    const key = nameKey(name.trim());
    return (await this.list()).find((peer) => nameKey(peer.name) === key) ?? null;
  }

  async findByNodeId(nodeId: string): Promise<PeerNode | null> {
    return (await this.list()).find((peer) => peer.nodeId === nodeId) ?? null;
  }

  /**
   * Saves a pair `PeerPairing` just made (contract §3): a new row named `name` (made valid and unique), or, for a node
   * already listed (Pair again: a pair made before node keys, or a peer whose machine changed), its row with the new
   * key, address, machine and relation, its name kept. `addedAt` is the moment of this pair.
   */
  savePairedPeer(input: PairedPeerInput): Promise<PeerNode> {
    return this.serialized(async () => {
      const peers = await this.storedPeers();
      const existing = peers.find((peer) => peer.nodeId === input.nodeId);
      const saved: StoredPeer = Object.freeze({
        nodeId: input.nodeId,
        name: existing?.name ?? uniqueName(input.name, peers.map((peer) => peer.name)),
        publicKey: input.publicKey,
        address: input.address,
        machine: input.machine,
        account: input.account,
        relation: input.relation,
        sandbox: input.sandbox ?? existing?.sandbox ?? false,
        addedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
      });
      await this.write(existing ? peers.map((peer) => (peer.nodeId === saved.nodeId ? saved : peer)) : [...peers, saved]);
      return toPeerNode(saved);
    });
  }

  /** Whether `nodeId` may pair: never this node itself. */
  async assertPairable(nodeId: string): Promise<void> {
    if (nodeId === await this.dependencies.ownNodeId()) {
      throw new RemoteCollaborationSettingsError("PEER_IS_THIS_NODE", "That node is this node itself.");
    }
  }

  /**
   * Where this node reaches a peer paired by plain address (one-nodes-tab TR-711): the same node must answer at the new
   * address. A peer on the private network is reached by its machine, so its address is not typed.
   */
  changeAddress(nodeId: string, addressInput: string): Promise<PeerNode> {
    return this.serialized(async () => {
      const address = this.requireAddress(addressInput);
      const peers = await this.storedPeers();
      const peer = this.requirePeer(peers, nodeId);
      if (peer.machine !== null) {
        throw new RemoteCollaborationSettingsError("PEER_ADDRESS_FIXED", `'${peer.name}' is reached on the private network; its address is not typed.`);
      }
      if (await this.probe(address) !== nodeId) {
        throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answers at ${address} than the one paired.`, { address });
      }
      const changed: StoredPeer = Object.freeze({ ...peer, address });
      await this.write(peers.map((entry) => entry.nodeId === nodeId ? changed : entry));
      return toPeerNode(changed);
    });
  }

  rename(nodeId: string, nameInput: string): Promise<PeerNode> {
    return this.serialized(async () => {
      const name = this.requireName(nameInput);
      const peers = await this.storedPeers();
      const peer = this.requirePeer(peers, nodeId);
      this.assertNameFree(peers, name, nodeId);
      const renamed: StoredPeer = Object.freeze({ ...peer, name });
      await this.write(peers.map((entry) => entry.nodeId === nodeId ? renamed : entry));
      return toPeerNode(renamed);
    });
  }

  /** Removes the peer's record and closes its open sockets (NA-11). `PeerPairing` tells the other node first. */
  remove(nodeId: string): Promise<void> {
    return this.serialized(async () => {
      const peers = await this.storedPeers();
      this.requirePeer(peers, nodeId);
      await this.write(peers.filter((peer) => peer.nodeId !== nodeId));
      this.events.emit("revoked", { kind: "peer", id: nodeId, refusal: NODE_ACCESS_REFUSALS.peerUnpaired });
    });
  }

  onClientRevoked(listener: ClientRevocationListener): () => void {
    this.events.on("revoked", listener);
    return () => this.events.off("revoked", listener);
  }

  private async storedPeers(): Promise<readonly StoredPeer[]> {
    this.stored ??= await this.dependencies.store.read();
    return this.stored;
  }

  private async write(peers: readonly StoredPeer[]): Promise<void> {
    await this.dependencies.store.write(peers);
    this.stored = peers;
  }

  private requireAddress(value: string): string {
    try { return normalizeNodeBaseUrl(value); }
    catch (error) { throw new RemoteCollaborationSettingsError("PEER_URL_INVALID", error instanceof Error ? error.message : String(error)); }
  }

  /** The node at `address`; an unreachable loopback address says so when this node runs in a container (REQ-708). */
  private async probe(address: string): Promise<string> {
    try {
      return await this.dependencies.probe.fetchNodeId(address);
    } catch (error) {
      if (error instanceof RemoteCollaborationSettingsError && error.code === "PEER_UNREACHABLE") {
        throw new RemoteCollaborationSettingsError(error.code, error.message,
          { ...error.details, loopbackInContainer: loopbackInContainer(address, this.dependencies.runsInContainer) });
      }
      throw error;
    }
  }

  private requireName(value: string): string {
    const name = String(value ?? "").trim();
    if (!NAME_PATTERN.test(name)) {
      throw new RemoteCollaborationSettingsError("PEER_NAME_INVALID",
        "A peer name is 1 to 64 characters: letters, digits, spaces, '_', '.' or '-', starting with a letter or digit.");
    }
    return name;
  }

  private assertNameFree(peers: readonly StoredPeer[], name: string, exceptNodeId: string | null): void {
    if (peers.some((peer) => peer.nodeId !== exceptNodeId && nameKey(peer.name) === nameKey(name))) {
      throw new RemoteCollaborationSettingsError("PEER_NAME_TAKEN", `Another peer is already named '${name}'.`);
    }
  }

  private requirePeer(peers: readonly StoredPeer[], nodeId: string): StoredPeer {
    const peer = peers.find((entry) => entry.nodeId === nodeId);
    if (!peer) throw new RemoteCollaborationSettingsError("PEER_NOT_FOUND", `No peer node '${nodeId}' is paired.`);
    return peer;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
