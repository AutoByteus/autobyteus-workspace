import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";
import type { PeerNode } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { loopbackInContainer } from "./peer-address-resolver.js";
import type { RemoteCollaborationCapability } from "./remote-collaboration-capability.js";
import type { PeerStore } from "./peer-store.js";

/** How the directory learns the server identity behind a URL (`PeerClient`'s identity probe). */
export type PeerIdentityProbe = Readonly<{
  /** The node ID of the AutoByteus node at `baseUrl`; rejects with a settings error otherwise. */
  fetchNodeId(baseUrl: string): Promise<string>;
}>;

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/;
const nameKey = (name: string): string => name.toLocaleLowerCase("en-US");

/**
 * The peers of this node (DEC-101, REQ-102): add (the URL must reach the expected AutoByteus node, whose server
 * identity is pinned), change a peer's address (the pinned node must answer there), rename, remove, and lookup by
 * name or node ID. The only reader and writer of `peers.json`. Changes are serialized. Removing a peer keeps run
 * history; links naming it are then refused.
 */
export class PeerDirectory {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dependencies: Readonly<{
    store: PeerStore;
    probe: PeerIdentityProbe;
    capability: Pick<RemoteCollaborationCapability, "isEnabled">;
    ownNodeId(): Promise<string>;
    runsInContainer(): boolean;
    now?(): Date;
  }>) {}

  list(): Promise<readonly PeerNode[]> { return this.dependencies.store.read(); }

  async findByName(name: string): Promise<PeerNode | null> {
    const key = nameKey(name.trim());
    return (await this.list()).find((peer) => nameKey(peer.name) === key) ?? null;
  }

  async findByNodeId(nodeId: string): Promise<PeerNode | null> {
    return (await this.list()).find((peer) => peer.nodeId === nodeId) ?? null;
  }

  /**
   * Registers the node `nodeId` at `baseUrl` (one-nodes-tab: the caller names the node it means; the address must
   * answer with it). Contacting the URL is a request to another node, so it needs the switch on (REQ-101).
   */
  add(input: Readonly<{ nodeId: string; name: string; baseUrl: string }>): Promise<PeerNode> {
    return this.serialized(async () => {
      this.requireSwitchOn("Turn on Remote Collaboration before adding a peer node.");
      const name = this.requireName(input.name);
      const baseUrl = this.requireUrl(input.baseUrl);
      const peers = await this.list();
      this.assertNameFree(peers, name, null);
      const nodeId = await this.probe(baseUrl);
      if (nodeId === await this.dependencies.ownNodeId()) {
        throw new RemoteCollaborationSettingsError("PEER_IS_THIS_NODE", `${baseUrl} is this node itself.`);
      }
      if (nodeId !== input.nodeId) {
        throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answers at ${baseUrl}.`, { address: baseUrl });
      }
      const existing = peers.find((peer) => peer.nodeId === nodeId);
      if (existing) {
        throw new RemoteCollaborationSettingsError("PEER_ALREADY_REGISTERED", `The node at ${baseUrl} is already registered as '${existing.name}'.`);
      }
      const peer: PeerNode = Object.freeze({ nodeId, name, baseUrl, addedAt: (this.dependencies.now?.() ?? new Date()).toISOString() });
      await this.dependencies.store.write([...peers, peer]);
      return peer;
    });
  }

  /** The address this node uses for a peer (one-nodes-tab TR-711): the pinned node must answer at the new one. */
  changeAddress(nodeId: string, baseUrlInput: string): Promise<PeerNode> {
    return this.serialized(async () => {
      this.requireSwitchOn("Turn on Remote Collaboration before changing a peer node's address.");
      const baseUrl = this.requireUrl(baseUrlInput);
      const peers = await this.list();
      const peer = this.requirePeer(peers, nodeId);
      if (await this.probe(baseUrl) !== nodeId) {
        throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answers at ${baseUrl} than the one registered.`, { address: baseUrl });
      }
      const changed: PeerNode = Object.freeze({ ...peer, baseUrl });
      await this.dependencies.store.write(peers.map((entry) => entry.nodeId === nodeId ? changed : entry));
      return changed;
    });
  }

  rename(nodeId: string, nameInput: string): Promise<PeerNode> {
    return this.serialized(async () => {
      const name = this.requireName(nameInput);
      const peers = await this.list();
      const peer = this.requirePeer(peers, nodeId);
      this.assertNameFree(peers, name, nodeId);
      const renamed: PeerNode = Object.freeze({ ...peer, name });
      await this.dependencies.store.write(peers.map((entry) => entry.nodeId === nodeId ? renamed : entry));
      return renamed;
    });
  }

  remove(nodeId: string): Promise<void> {
    return this.serialized(async () => {
      const peers = await this.list();
      this.requirePeer(peers, nodeId);
      await this.dependencies.store.write(peers.filter((peer) => peer.nodeId !== nodeId));
    });
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

  private assertNameFree(peers: readonly PeerNode[], name: string, exceptNodeId: string | null): void {
    if (peers.some((peer) => peer.nodeId !== exceptNodeId && nameKey(peer.name) === nameKey(name))) {
      throw new RemoteCollaborationSettingsError("PEER_NAME_TAKEN", `Another peer is already named '${name}'.`);
    }
  }

  private requirePeer(peers: readonly PeerNode[], nodeId: string): PeerNode {
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
