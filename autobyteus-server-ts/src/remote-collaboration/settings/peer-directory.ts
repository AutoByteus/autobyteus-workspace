import { EventEmitter } from "node:events";
import type { ClientRevocationListener, ClientRevocationSource } from "../../node-access/domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";
import type { PeerNode } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { loopbackInContainer } from "./peer-address-resolver.js";
import type { RemoteCollaborationCapability } from "./remote-collaboration-capability.js";
import type { PeerStore, StoredPeer } from "./peer-store.js";

/** How the directory learns the server identity behind a URL (`PeerClient`'s identity probe). */
export type PeerIdentityProbe = Readonly<{
  /** The node ID of the AutoByteus node at `baseUrl`; rejects with a settings error otherwise. */
  fetchNodeId(baseUrl: string): Promise<string>;
}>;

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/;
const NAME_MAX = 64;
const nameKey = (name: string): string => name.toLocaleLowerCase("en-US");

const toPeerNode = (stored: StoredPeer): PeerNode => Object.freeze({
  nodeId: stored.nodeId,
  name: stored.name,
  baseUrl: stored.baseUrl,
  addedAt: stored.addedAt,
  paired: stored.peerSecret !== null,
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

/** A peer as pairing saves it: the address this node reaches it at and the secret both nodes now share. */
export type PairedPeerInput = Readonly<{ nodeId: string; name: string; baseUrl: string; peerSecret: string }>;

/**
 * The peers of this node (DEC-101, REQ-102): save a peer pairing found (node access model NA-9), change a peer's
 * address (the pinned node must answer there), rename, remove, and lookup by name or node ID. The only reader and
 * writer of `peers.json`, read once and kept in memory (a peer request's signature check touches no file). Changes
 * are serialized. Removing a peer forgets its secret and closes its open sockets (NA-11); run history is kept and
 * links naming it are then refused.
 */
export class PeerDirectory implements ClientRevocationSource {
  private tail: Promise<unknown> = Promise.resolve();
  private stored: readonly StoredPeer[] | null = null;
  private readonly events = new EventEmitter();

  constructor(private readonly dependencies: Readonly<{
    store: PeerStore;
    probe: PeerIdentityProbe;
    capability: Pick<RemoteCollaborationCapability, "isEnabled">;
    ownNodeId(): Promise<string>;
    runsInContainer(): boolean;
    now?(): Date;
  }>) {}

  async list(): Promise<readonly PeerNode[]> {
    return (await this.storedPeers()).map(toPeerNode);
  }

  /** The secret this node shares with the paired peer `nodeId`; `null` for an unpaired or unknown peer. */
  async peerSecret(nodeId: string): Promise<string | null> {
    return (await this.storedPeers()).find((peer) => peer.nodeId === nodeId)?.peerSecret ?? null;
  }

  async findByName(name: string): Promise<PeerNode | null> {
    const key = nameKey(name.trim());
    return (await this.list()).find((peer) => nameKey(peer.name) === key) ?? null;
  }

  async findByNodeId(nodeId: string): Promise<PeerNode | null> {
    return (await this.list()).find((peer) => peer.nodeId === nodeId) ?? null;
  }

  /**
   * Saves a peer this node just paired with (design M-9): a new row named `name` (made valid and unique), or, for a
   * peer registered before peers paired, its row with the new address and secret (its name and history kept). A peer
   * that is already paired pairs again only after the owner removes it.
   */
  savePairedPeer(input: PairedPeerInput): Promise<PeerNode> {
    return this.serialized(async () => {
      const peers = await this.storedPeers();
      const existing = peers.find((peer) => peer.nodeId === input.nodeId);
      if (existing?.peerSecret) {
        throw new RemoteCollaborationSettingsError("PEER_ALREADY_REGISTERED",
          `The node is already paired as '${existing.name}'. Remove it first to pair again.`);
      }
      const saved: StoredPeer = existing
        ? Object.freeze({ ...existing, baseUrl: input.baseUrl, peerSecret: input.peerSecret })
        : Object.freeze({
          nodeId: input.nodeId,
          name: uniqueName(input.name, peers.map((peer) => peer.name)),
          baseUrl: input.baseUrl,
          addedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
          peerSecret: input.peerSecret,
        });
      await this.write(existing ? peers.map((peer) => (peer.nodeId === saved.nodeId ? saved : peer)) : [...peers, saved]);
      return toPeerNode(saved);
    });
  }

  /** Whether `nodeId` may pair: not this node, and not a peer that is already paired. */
  async assertPairable(nodeId: string): Promise<void> {
    if (nodeId === await this.dependencies.ownNodeId()) {
      throw new RemoteCollaborationSettingsError("PEER_IS_THIS_NODE", "That node is this node itself.");
    }
    const existing = (await this.storedPeers()).find((peer) => peer.nodeId === nodeId);
    if (existing?.peerSecret) {
      throw new RemoteCollaborationSettingsError("PEER_ALREADY_REGISTERED",
        `The node is already paired as '${existing.name}'. Remove it first to pair again.`);
    }
  }

  /** The address this node uses for a peer (one-nodes-tab TR-711): the pinned node must answer at the new one. */
  changeAddress(nodeId: string, baseUrlInput: string): Promise<PeerNode> {
    return this.serialized(async () => {
      this.requireSwitchOn("Turn on Remote Collaboration before changing a peer node's address.");
      const baseUrl = this.requireUrl(baseUrlInput);
      const peers = await this.storedPeers();
      const peer = this.requirePeer(peers, nodeId);
      if (await this.probe(baseUrl) !== nodeId) {
        throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answers at ${baseUrl} than the one registered.`, { address: baseUrl });
      }
      const changed: StoredPeer = Object.freeze({ ...peer, baseUrl });
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

  private requireSwitchOn(message: string): void {
    if (!this.dependencies.capability.isEnabled()) throw new RemoteCollaborationSettingsError("REMOTE_COLLABORATION_OFF", message);
  }

  private requireUrl(value: string): string {
    try { return normalizeNodeBaseUrl(value); }
    catch (error) { throw new RemoteCollaborationSettingsError("PEER_URL_INVALID", error instanceof Error ? error.message : String(error)); }
  }

  /** The node at `baseUrl`; an unreachable loopback address says so when this node runs in a container (REQ-708). */
  private async probe(baseUrl: string): Promise<string> {
    try {
      return await this.dependencies.probe.fetchNodeId(baseUrl);
    } catch (error) {
      if (error instanceof RemoteCollaborationSettingsError && error.code === "PEER_UNREACHABLE") {
        throw new RemoteCollaborationSettingsError(error.code, error.message,
          { ...error.details, loopbackInContainer: loopbackInContainer(baseUrl, this.dependencies.runsInContainer) });
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
    if (!peer) throw new RemoteCollaborationSettingsError("PEER_NOT_FOUND", `No peer node '${nodeId}' is registered.`);
    return peer;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
