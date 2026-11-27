import { randomBytes } from "node:crypto";
import { generateOneTimeCode, hashSecret } from "../../node-access/domain/credential-secret.js";
import type { ClientIdentity } from "../../node-access/domain/client-identity.js";
import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";
import type { PeerPairingClient } from "../channel/peer-pairing-client.js";
import type { PeerNode, PeerRelation } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import {
  REMOTE_PAIR_ACCEPTED_PATH,
  REMOTE_PAIR_CONFIRM_PATH,
  REMOTE_PAIR_PATH,
  REMOTE_PAIR_REJECTED_PATH,
  REMOTE_UNPAIRED_PATH,
} from "../domain/remote-requests.js";
import type { PeerDirectory, PeerIdentityProbe } from "../settings/peer-directory.js";
import { isNodePublicKey, type NodeKey } from "./node-key.js";

const GRANT_TTL_MS = 10 * 60 * 1000;
/** Pending requests kept per node (ARCH-REV-004): one per asking node; beyond this the oldest is dropped. */
export const PENDING_PAIR_REQUESTS_MAX = 20;
const OUTSTANDING_PAIR_REQUESTS_MAX = 20;
const NODE_ID_PATTERN = /^srv_[A-Za-z0-9_-]{32,}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
/** At most this many addresses of an asking node are probed (they are asked at once, each within the probe bound). */
export const PAIR_ADDRESSES_MAX = 8;
/** One address of an asking node answers within this bound, so the pair message is answered within its own. */
export const PAIR_ADDRESS_PROBE_TIMEOUT_MS = 5_000;

/** The machine and account the private network proved for the connection a message came on; `null` otherwise. */
export type PairCaller = Readonly<{ machine: string; account: string | null }> | null;

/** A pair request waiting for this node's owner (contract §1): who asks, and where the acceptance goes. */
export type PendingPairRequest = Readonly<{
  id: string;
  nodeId: string;
  name: string;
  address: string;
  machine: string | null;
  account: string | null;
  receivedAt: string;
}>;

/** A pair request this node sent and that waits for the other owner (`declined` once rejected). */
export type OutstandingPairRequest = Readonly<{ requestId: string; address: string; state: "waiting" | "declined"; createdAt: string }>;

export type PairOutcome = Readonly<{ state: "paired"; peer: PeerNode }> | Readonly<{ state: "waiting"; requestId: string }>;

/** A received message's HTTP answer. */
export type PairingResponse = Readonly<{ status: number; answer: Readonly<Record<string, unknown>> }>;

type Grant = Readonly<{ relation: PeerRelation; forMachine: string | null; nameForAsker: string | null; expiresAtMs: number }>;
type Pending = PendingPairRequest & Readonly<{ requestId: string; publicKey: string }>;
type Outstanding = Readonly<{ requestId: string; address: string; name: string | null; state: "waiting" | "declined"; createdAt: string }>;
type Identity = Readonly<{ nodeId: string; name: string; publicKey: string }>;

const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const refused = (status: number, code: string, message: string): PairingResponse => Object.freeze({ status, answer: { code, message } });
const addressOf = (value: string): string => {
  try { return normalizeNodeBaseUrl(value); }
  catch (error) { throw new RemoteCollaborationSettingsError("PEER_URL_INVALID", error instanceof Error ? error.message : String(error)); }
};

/** The addresses a message offers (contract §2 `addresses`), valid ones normalized, each once, in its order. */
const addressesOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value.slice(0, PAIR_ADDRESSES_MAX)) {
    if (!text(entry, 2048)) continue;
    try {
      const address = normalizeNodeBaseUrl(entry);
      if (!result.some((known) => known.toLowerCase() === address.toLowerCase())) result.push(address);
    } catch { /* not an address: skipped */ }
  }
  return result;
};

/** The asking node's identity in a message, read strictly; `null` when any field is missing or malformed. */
const identityOf = (body: Readonly<Record<string, unknown>>): Identity | null =>
  NODE_ID_PATTERN.test(String(body.nodeId)) && text(body.name, 128) && typeof body.publicKey === "string" && isNodePublicKey(body.publicKey)
    ? Object.freeze({ nodeId: body.nodeId as string, name: (body.name as string).trim(), publicKey: body.publicKey }) : null;

/**
 * Pairing (autobyteus-661 contract §2, §3; design DS-4, DS-5), the only maker of peer records. A pair message offers
 * every address the asking node may be reached at, in its order; the receiving node asks each one's identity route and
 * keeps the first that answers as the asking node (the resolution the two nodes did before, moved to the receiver).
 * Two ways, one model:
 * - **Your own nodes, one click.** The AutoByteus app that controls both has B make a grant (`createGrant`: relation,
 *   optionally the asking machine and B's name for it; one use, 10 minutes, in memory) and A send `pair` with it: B
 *   stores A and answers its identity, A stores B. A host pairs its sandbox the same way (autobyteus-581).
 * - **A node this app does not control.** A sends `pair` with a `requestId`; B keeps a pending request until its
 *   owner Accepts (B stores A as `teammate`, sends `pair-accepted`; A confirms with a signed `pair-confirm` to the
 *   address it asked at, and stores B only when the same node answers) or Rejects (`pair-rejected`). A may Cancel.
 * Unpair tells the other node (signed `unpaired`) and removes the record here. Grants, pending and outstanding
 * requests live in memory only: a restart drops them and the other side asks again.
 */
export class PeerPairing {
  private readonly grants = new Map<string, Grant>();
  private pending: Pending[] = [];
  private readonly outstanding = new Map<string, Outstanding>();

  constructor(private readonly dependencies: Readonly<{
    peers: Pick<PeerDirectory, "assertPairable" | "savePairedPeer" | "findByNodeId" | "remove">;
    client: Pick<PeerPairingClient, "send" | "sendSigned">;
    /** Asks an address which node answers there (its exempt identity route), within the given bound. */
    probe: Readonly<{ fetchNodeId(address: string, timeoutMs?: number): ReturnType<PeerIdentityProbe["fetchNodeId"]> }>;
    nodeKey: Pick<NodeKey, "publicKey">;
    ownNodeId(): Promise<string>;
    /** This node's name, as another node labels it unless its owner gives one. */
    ownName(): Promise<string>;
    /** Where another node may reach this node, in order of preference (the other node keeps the first that answers). */
    ownAddresses(): readonly string[];
    now?(): number;
  }>) {}

  /** On B (owner): a one-time grant for one pair from a node this app controls (case 1). */
  createGrant(input: Readonly<{ relation: PeerRelation; forMachine?: string | null; nameForAsker?: string | null }>): Readonly<{ grant: string; expiresAt: string }> {
    this.forgetExpiredGrants();
    const grant = generateOneTimeCode();
    const expiresAtMs = this.now() + GRANT_TTL_MS;
    this.grants.set(hashSecret(grant), Object.freeze({
      relation: input.relation, forMachine: input.forMachine?.trim() || null, nameForAsker: input.nameForAsker?.trim() || null, expiresAtMs,
    }));
    return Object.freeze({ grant, expiresAt: new Date(expiresAtMs).toISOString() });
  }

  /**
   * On A (owner): pair with the node at `address`. With B's grant it pairs at once (`paired`); without, it asks and
   * waits for B's owner (`waiting`). `nodeId`: the node the app expects there (refused when another answers); `name`:
   * this node's label for B. B finds where it reaches this node among this node's addresses.
   */
  async pair(input: Readonly<{
    address: string; grant?: string | null; nodeId?: string | null; name?: string | null; sandbox?: boolean;
  }>): Promise<PairOutcome> {
    const address = addressOf(input.address);
    const own = await this.ownIdentity();
    const addresses = addressesOf(this.dependencies.ownAddresses());
    if (!addresses.length) throw new RemoteCollaborationSettingsError("PEER_URL_INVALID", "This node knows no address another node could reach it at.");
    const route = { address, machine: null };
    if (!input.grant) {
      if (this.outstanding.size >= OUTSTANDING_PAIR_REQUESTS_MAX) {
        throw new RemoteCollaborationSettingsError("PEER_PAIRING_REFUSED", "Too many pair requests wait for an answer; cancel one first.");
      }
      const requestId = randomBytes(16).toString("base64url");
      this.outstanding.set(requestId, Object.freeze({ requestId, address, name: input.name?.trim() || null, state: "waiting", createdAt: this.isoNow() }));
      try {
        const answer = await this.dependencies.client.send(route, REMOTE_PAIR_PATH, { ...own, addresses, requestId });
        if (answer.status !== 202) throw this.refusalOf(answer, address);
      } catch (error) {
        this.outstanding.delete(requestId);
        throw error;
      }
      return Object.freeze({ state: "waiting", requestId });
    }
    const answer = await this.dependencies.client.send(route, REMOTE_PAIR_PATH, { ...own, addresses, grant: input.grant });
    const peer = answer.status === 200 && answer.body ? identityOf(answer.body) : null;
    if (!peer) throw this.refusalOf(answer, address);
    if (input.nodeId && peer.nodeId !== input.nodeId) {
      throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answered at ${address}.`, { address });
    }
    await this.dependencies.peers.assertPairable(peer.nodeId);
    const saved = await this.dependencies.peers.savePairedPeer({
      nodeId: peer.nodeId, name: input.name?.trim() || peer.name, publicKey: peer.publicKey, address, machine: null, account: null,
      relation: "own", sandbox: input.sandbox ?? false,
    });
    return Object.freeze({ state: "paired", peer: saved });
  }

  /**
   * On B: `POST /rest/remote/pair` (exempt): a grant pairs at once; a `requestId` waits for this node's owner. Either way
   * the asking node must answer as itself at one of the addresses it offers, which becomes the record's `address`.
   */
  async receivePair(body: unknown, caller: PairCaller): Promise<PairingResponse> {
    const message = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const asker = identityOf(message);
    const offered = addressesOf(message.addresses);
    if (!asker || !offered.length) return refused(400, "PAIR_REQUEST_INVALID", "The pair request is incomplete.");
    return this.answering(async () => {
      await this.dependencies.peers.assertPairable(asker.nodeId);
      const withGrant = typeof message.grant === "string" && message.grant ? hashSecret(message.grant.trim()) : null;
      if (withGrant) {
        this.forgetExpiredGrants();
        const grant = this.grants.get(withGrant);
        if (!grant || (grant.forMachine !== null && grant.forMachine !== caller?.machine)) {
          return refused(403, "PAIRING_GRANT_INVALID", "This pairing grant is not valid here. Pair again.");
        }
      } else if (typeof message.requestId !== "string" || !REQUEST_ID_PATTERN.test(message.requestId)) {
        return refused(400, "PAIR_REQUEST_INVALID", "The pair request has neither a grant nor a request ID.");
      }
      const address = await this.answeringAddress(asker.nodeId, offered);
      if (!address) {
        return refused(409, "PAIR_ADDRESS_UNREACHABLE", "This node reaches the asking node at none of the addresses it gave.");
      }
      if (withGrant) {
        const grant = this.grants.get(withGrant);
        // The grant is used once: a second request with it while the first was probing finds it gone.
        if (!grant || !this.grants.delete(withGrant)) return refused(403, "PAIRING_GRANT_INVALID", "This pairing grant is not valid here. Pair again.");
        await this.dependencies.peers.savePairedPeer({
          nodeId: asker.nodeId, name: grant.nameForAsker ?? asker.name, publicKey: asker.publicKey, address,
          machine: caller?.machine ?? null, account: caller?.account ?? null, relation: grant.relation,
        });
        return Object.freeze({ status: 200, answer: await this.ownIdentity() });
      }
      const request: Pending = Object.freeze({
        id: randomBytes(8).toString("hex"), requestId: message.requestId as string, nodeId: asker.nodeId, name: asker.name,
        publicKey: asker.publicKey, address, machine: caller?.machine ?? null, account: caller?.account ?? null, receivedAt: this.isoNow(),
      });
      this.pending = [...this.pending.filter((entry) => entry.nodeId !== asker.nodeId), request].slice(-PENDING_PAIR_REQUESTS_MAX);
      return Object.freeze({ status: 202, answer: { pending: true } });
    });
  }

  pendingRequests(): readonly PendingPairRequest[] {
    return Object.freeze(this.pending.map(({ id, nodeId, name, address, machine, account, receivedAt }) =>
      Object.freeze({ id, nodeId, name, address, machine, account, receivedAt })));
  }

  outstandingRequests(): readonly OutstandingPairRequest[] {
    return Object.freeze([...this.outstanding.values()].map(({ requestId, address, state, createdAt }) =>
      Object.freeze({ requestId, address, state, createdAt })));
  }

  /**
   * On B (owner): Accept. B stores A as `teammate` and tells A, which confirms with a signed call before it stores B.
   * When A does not take the acceptance (unreachable, cancelled, not confirmed), B's record of A is removed again.
   */
  async accept(id: string, name?: string | null): Promise<PeerNode> {
    const request = this.takePending(id);
    const saved = await this.dependencies.peers.savePairedPeer({
      nodeId: request.nodeId, name: name?.trim() || request.name, publicKey: request.publicKey, address: request.address,
      machine: request.machine, account: request.account, relation: "teammate",
    });
    try {
      const answer = await this.dependencies.client.send({ address: request.address, machine: request.machine }, REMOTE_PAIR_ACCEPTED_PATH,
        { ...await this.ownIdentity(), requestId: request.requestId });
      if (answer.status !== 200) throw this.refusalOf(answer, request.address);
    } catch (error) {
      await this.dependencies.peers.remove(request.nodeId).catch(() => undefined);
      throw error;
    }
    return saved;
  }

  /** On B (owner): Reject. A is told (when it can be reached); nothing is stored. */
  async reject(id: string): Promise<void> {
    const request = this.takePending(id);
    await this.dependencies.client.send({ address: request.address, machine: request.machine }, REMOTE_PAIR_REJECTED_PATH,
      { requestId: request.requestId }).catch(() => undefined);
  }

  /** On A (owner): Cancel. A later acceptance of it is refused. */
  cancel(requestId: string): boolean {
    return this.outstanding.delete(requestId);
  }

  /** On A: `POST /rest/remote/pair-accepted` (exempt), only for an outstanding request; confirmed before A stores B. */
  async receivePairAccepted(body: unknown, caller: PairCaller): Promise<PairingResponse> {
    const message = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const accepter = identityOf(message);
    const request = typeof message.requestId === "string" ? this.outstanding.get(message.requestId) : undefined;
    if (!accepter) return refused(400, "PAIR_REQUEST_INVALID", "The acceptance is incomplete.");
    if (!request || request.state !== "waiting") return refused(403, "PAIR_REQUEST_NOT_FOUND", "This node did not ask to pair, or withdrew it.");
    return this.answering(async () => {
      const ownNodeId = await this.dependencies.ownNodeId();
      const route = { address: request.address, machine: caller?.machine ?? null };
      const confirm = await this.dependencies.client.sendSigned(route, REMOTE_PAIR_CONFIRM_PATH, { nodeId: ownNodeId },
        { fromNodeId: ownNodeId, toNodeId: accepter.nodeId }).catch(() => null);
      if (confirm?.status !== 200 || confirm.body?.nodeId !== accepter.nodeId) {
        return refused(403, "PAIR_NOT_CONFIRMED", "The node at the address this node asked did not confirm the acceptance.");
      }
      if (this.outstanding.get(request.requestId) !== request) {
        return refused(403, "PAIR_REQUEST_NOT_FOUND", "This node withdrew its request.");
      }
      this.outstanding.delete(request.requestId);
      await this.dependencies.peers.savePairedPeer({
        nodeId: accepter.nodeId, name: request.name ?? accepter.name, publicKey: accepter.publicKey, address: request.address,
        machine: caller?.machine ?? null, account: caller?.account ?? null, relation: "teammate",
      });
      return Object.freeze({ status: 200, answer: { nodeId: ownNodeId } });
    });
  }

  /** On A: `POST /rest/remote/pair-rejected` (exempt), only for an outstanding request: it shows "declined". */
  receivePairRejected(body: unknown): PairingResponse {
    const requestId = (body as { requestId?: unknown } | null)?.requestId;
    const request = typeof requestId === "string" ? this.outstanding.get(requestId) : undefined;
    if (!request || request.state !== "waiting") return refused(403, "PAIR_REQUEST_NOT_FOUND", "This node did not ask to pair, or withdrew it.");
    this.outstanding.set(request.requestId, Object.freeze({ ...request, state: "declined" }));
    return Object.freeze({ status: 200, answer: {} });
  }

  /** On B: `POST /rest/remote/pair-confirm` (signed): answered only to the node it names, which B holds as a peer. */
  async receivePairConfirm(body: unknown, identity: ClientIdentity | null): Promise<PairingResponse> {
    const nodeId = (body as { nodeId?: unknown } | null)?.nodeId;
    if (identity?.kind !== "peer" || nodeId !== identity.nodeId) return refused(403, "PAIR_NOT_CONFIRMED", "Confirmed only to the node that signs.");
    return this.answering(async () => Object.freeze({ status: 200, answer: { nodeId: await this.dependencies.ownNodeId() } }));
  }

  /** On A (owner): Unpair. The other node is told (signed `unpaired`) when it can be; the record here is removed. */
  async unpair(nodeId: string): Promise<void> {
    const peer = await this.dependencies.peers.findByNodeId(nodeId);
    if (!peer) throw new RemoteCollaborationSettingsError("PEER_NOT_FOUND", `No peer node '${nodeId}' is paired.`);
    if (peer.paired) {
      const ownNodeId = await this.dependencies.ownNodeId();
      await this.dependencies.client.sendSigned({ address: peer.address, machine: peer.machine }, REMOTE_UNPAIRED_PATH, {},
        { fromNodeId: ownNodeId, toNodeId: nodeId }).catch(() => undefined);
    }
    await this.dependencies.peers.remove(nodeId);
  }

  /** On B: `POST /rest/remote/unpaired` (signed): the calling peer ended the pair; B removes its record of it. */
  async receiveUnpaired(identity: ClientIdentity | null): Promise<PairingResponse> {
    if (identity?.kind !== "peer") return refused(403, "NODE_ROUTE_NOT_PERMITTED", "Peers only.");
    await this.dependencies.peers.remove(identity.nodeId).catch(() => undefined);
    return this.answering(async () => Object.freeze({ status: 200, answer: { nodeId: await this.dependencies.ownNodeId() } }));
  }

  /**
   * The first of `addresses`, in their order, at which `nodeId` answers its identity route: all are asked at once,
   * each within the probe bound; `null` when none answers as that node (another node, nothing, not AutoByteus).
   */
  private async answeringAddress(nodeId: string, addresses: readonly string[]): Promise<string | null> {
    const answers = await Promise.all(addresses.map((address) => this.dependencies.probe.fetchNodeId(address, PAIR_ADDRESS_PROBE_TIMEOUT_MS)
      .then((answered) => answered === nodeId, () => false)));
    return addresses[answers.indexOf(true)] ?? null;
  }

  private async ownIdentity(): Promise<Identity> {
    return Object.freeze({
      nodeId: await this.dependencies.ownNodeId(),
      name: await this.dependencies.ownName(),
      publicKey: await this.dependencies.nodeKey.publicKey(),
    });
  }

  private takePending(id: string): Pending {
    const request = this.pending.find((entry) => entry.id === id);
    if (!request) throw new RemoteCollaborationSettingsError("PAIR_REQUEST_NOT_FOUND", "That pair request no longer waits here.");
    this.pending = this.pending.filter((entry) => entry !== request);
    return request;
  }

  /**
   * The other node's refusal as the settings error the Nodes page words (its message when it gave one). A node whose Host
   * gate refuses the name it was addressed by says so (autobyteus-426 REQ-020), as for any address the owner gives.
   */
  private refusalOf(answer: Readonly<{ status: number; body: Readonly<Record<string, unknown>> | null }>, address: string): RemoteCollaborationSettingsError {
    if (answer.status === 403 && answer.body?.code === "REMOTE_ACCESS_HOST_REFUSED") {
      const host = new URL(address).hostname;
      return new RemoteCollaborationSettingsError("PEER_HOST_REFUSED",
        `${address} refuses the name ${host}; add it to AUTOBYTEUS_ALLOWED_HOSTS on that node.`, { address, host });
    }
    const message = typeof answer.body?.message === "string" ? answer.body.message : `The node at ${address} refused the pairing (HTTP ${answer.status}).`;
    return new RemoteCollaborationSettingsError("PEER_PAIRING_REFUSED", message, { address });
  }

  /** A settings refusal while answering (this node itself, identity held back) becomes a 409 with its code. */
  private async answering(operation: () => Promise<PairingResponse>): Promise<PairingResponse> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RemoteCollaborationSettingsError) return refused(409, error.code, error.message);
      throw error;
    }
  }

  private now(): number {
    return this.dependencies.now?.() ?? Date.now();
  }

  private isoNow(): string {
    return new Date(this.now()).toISOString();
  }

  private forgetExpiredGrants(): void {
    const now = this.now();
    for (const [key, grant] of this.grants) if (grant.expiresAtMs <= now) this.grants.delete(key);
  }
}
