import { generateCredential, generateOneTimeCode, hashSecret } from "../../node-access/domain/credential-secret.js";
import type { PeerNode } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import type { PeerAddressResolver } from "./peer-address-resolver.js";
import type { PeerDirectory } from "./peer-directory.js";
import type { RemoteCollaborationCapability } from "./remote-collaboration-capability.js";

const INVITE_TTL_MS = 10 * 60 * 1000;
const INVITE_TEXT_PREFIX = "abpi_";

/** What a node's owner gives another node to pair (design M-9): this node, where it may be reached, a one-time code. */
export type PeerInvite = Readonly<{ nodeId: string; addressCandidates: readonly string[]; inviteCode: string }>;

export type CreatedPeerInvite = Readonly<{
  invite: PeerInvite;
  /** The invite as one copyable text (`abpi_…`), to paste on a node another desktop owns. */
  inviteText: string;
  expiresAt: string;
}>;

/** The pairing exchange's request, from the node that accepts an invite to the node that created it. */
export type PeerPairingExchangeRequest = Readonly<{
  inviteCode: string;
  fromNodeId: string;
  fromName: string;
  addressCandidates: readonly string[];
}>;

export type PeerPairingExchangeAnswer = Readonly<{ nodeId: string; peerSecret: string }>;

export type PeerPairingExchangeRefusal = Readonly<{ statusCode: 400 | 401 | 403 | 409; code: string; message: string }>;

/** How the accepting node calls the inviting node's exchange (`PeerClient`). */
export type PeerPairingExchangeTransport = Readonly<{
  exchangePeerInvite(baseUrl: string, request: PeerPairingExchangeRequest): Promise<PeerPairingExchangeAnswer>;
}>;

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === "string");

export const encodePeerInvite = (invite: PeerInvite): string =>
  `${INVITE_TEXT_PREFIX}${Buffer.from(JSON.stringify(invite), "utf8").toString("base64url")}`;

export const decodePeerInvite = (text: string): PeerInvite => {
  const trimmed = text.trim();
  const invalid = () => new RemoteCollaborationSettingsError("PEER_INVITE_INVALID", "This is not a peer invite. Copy the whole invite text again.");
  if (!trimmed.startsWith(INVITE_TEXT_PREFIX)) throw invalid();
  let value: Partial<PeerInvite> | null;
  try {
    value = JSON.parse(Buffer.from(trimmed.slice(INVITE_TEXT_PREFIX.length), "base64url").toString("utf8")) as Partial<PeerInvite>;
  } catch {
    throw invalid();
  }
  if (!value || typeof value.nodeId !== "string" || typeof value.inviteCode !== "string" || !isStringArray(value.addressCandidates)) {
    throw invalid();
  }
  return Object.freeze({ nodeId: value.nodeId, addressCandidates: Object.freeze([...value.addressCandidates]), inviteCode: value.inviteCode });
};

/**
 * Peer pairing (node access model NA-5, NA-9; design DS-004, M-9). On node A the owner creates an invite; node B
 * accepts it: B finds the address at which it reaches A (pinning A's node ID) and calls A's pairing exchange with its
 * own address candidates; A checks the one-time code, finds and pins B the same way, creates the peer secret, saves B
 * and answers; B saves A. One action registers both nodes, and only the secret's one trip in the exchange's answer
 * carries it. Invite codes: 10 minutes, single use, kept as hashes in memory.
 */
export class PeerPairingService {
  /** Unused invite codes: hash → expiry (ms). */
  private readonly invites = new Map<string, number>();

  constructor(private readonly dependencies: Readonly<{
    capability: Pick<RemoteCollaborationCapability, "isEnabled">;
    peers: Pick<PeerDirectory, "assertPairable" | "savePairedPeer">;
    addresses: Pick<PeerAddressResolver, "resolve">;
    transport: PeerPairingExchangeTransport;
    ownNodeId(): Promise<string>;
    /** How other nodes may reach this node, in order. */
    ownAddressCandidates(): readonly string[];
    /** This node's name, as another node labels it unless its owner gives one. */
    ownName(): Promise<string>;
    now?(): number;
  }>) {}

  /** On node A: a new invite for one other node. */
  async createInvite(): Promise<CreatedPeerInvite> {
    this.requireSwitchOn();
    this.forgetExpired();
    const inviteCode = generateOneTimeCode();
    const expiresAtMs = this.now() + INVITE_TTL_MS;
    this.invites.set(hashSecret(inviteCode), expiresAtMs);
    const invite: PeerInvite = Object.freeze({
      nodeId: await this.dependencies.ownNodeId(),
      addressCandidates: Object.freeze([...this.dependencies.ownAddressCandidates()]),
      inviteCode,
    });
    return Object.freeze({ invite, inviteText: encodePeerInvite(invite), expiresAt: new Date(expiresAtMs).toISOString() });
  }

  /**
   * On node B: pairs with the node that created the invite. `name` is B's label for A; `nameOnInviter`, A's label for
   * B (this node's name when not given).
   */
  async acceptInvite(inviteText: string, name: string, nameOnInviter: string | null): Promise<PeerNode> {
    this.requireSwitchOn();
    const invite = decodePeerInvite(inviteText);
    await this.dependencies.peers.assertPairable(invite.nodeId);
    const baseUrl = await this.dependencies.addresses.resolve(invite.nodeId, invite.addressCandidates);
    const answer = await this.dependencies.transport.exchangePeerInvite(baseUrl, {
      inviteCode: invite.inviteCode,
      fromNodeId: await this.dependencies.ownNodeId(),
      fromName: nameOnInviter?.trim() || await this.dependencies.ownName(),
      addressCandidates: this.dependencies.ownAddressCandidates(),
    });
    if (answer.nodeId !== invite.nodeId) {
      throw new RemoteCollaborationSettingsError("PEER_IDENTITY_MISMATCH", `A different node answered at ${baseUrl}.`, { address: baseUrl });
    }
    return this.dependencies.peers.savePairedPeer({ nodeId: invite.nodeId, name, baseUrl, peerSecret: answer.peerSecret });
  }

  /** On node A: the exchange B calls with the invite code (exempt from credentials: B has none yet, NA-6). */
  async exchange(body: unknown): Promise<PeerPairingExchangeAnswer | PeerPairingExchangeRefusal> {
    const request = body as Partial<PeerPairingExchangeRequest> | null;
    if (!request || typeof request.inviteCode !== "string" || typeof request.fromNodeId !== "string"
      || typeof request.fromName !== "string" || !isStringArray(request.addressCandidates)) {
      return { statusCode: 400, code: "PEER_PAIRING_BAD_REQUEST", message: "The pairing request is incomplete." };
    }
    if (!this.dependencies.capability.isEnabled()) {
      return { statusCode: 403, code: "REMOTE_COLLABORATION_OFF", message: "Remote collaboration is turned off on this node." };
    }
    this.forgetExpired();
    if (!this.invites.delete(hashSecret(request.inviteCode.trim()))) {
      return { statusCode: 401, code: "PEER_INVITE_INVALID", message: "This invite is not valid. Create a new one." };
    }
    try {
      await this.dependencies.peers.assertPairable(request.fromNodeId);
      const baseUrl = await this.dependencies.addresses.resolve(request.fromNodeId, request.addressCandidates);
      const peerSecret = generateCredential("");
      await this.dependencies.peers.savePairedPeer({ nodeId: request.fromNodeId, name: request.fromName, baseUrl, peerSecret });
      return Object.freeze({ nodeId: await this.dependencies.ownNodeId(), peerSecret });
    } catch (error) {
      if (error instanceof RemoteCollaborationSettingsError) {
        return { statusCode: 409, code: error.code, message: error.message };
      }
      throw error;
    }
  }

  private requireSwitchOn(): void {
    if (!this.dependencies.capability.isEnabled()) {
      throw new RemoteCollaborationSettingsError("REMOTE_COLLABORATION_OFF", "Turn on Remote Collaboration before pairing nodes.");
    }
  }

  private now(): number {
    return this.dependencies.now?.() ?? Date.now();
  }

  private forgetExpired(): void {
    const now = this.now();
    for (const [hash, expiresAt] of this.invites) {
      if (expiresAt <= now) this.invites.delete(hash);
    }
  }
}
