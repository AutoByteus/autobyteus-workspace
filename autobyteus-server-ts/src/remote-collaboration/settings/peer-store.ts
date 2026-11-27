import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import {
  isoTimestamp,
  objectRecord,
  requiredArray,
  requiredString,
  requireKeys,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import { remoteCollaborationSettingsPath, type AppDataDirSource } from "./settings-file-schema.js";

/** A peer's lifecycle mark on this node (C11): `sandbox`, a sandbox this node created. Absent: a normal peer. */
export type PeerRole = "sandbox";

/** One row of `peers.json`: the peer and, once the two nodes paired, the secret they share (NA-9). */
export type StoredPeer = Readonly<{
  nodeId: string;
  name: string;
  baseUrl: string;
  addedAt: string;
  peerSecret: string | null;
  role: PeerRole | null;
}>;

const parseRole = (value: unknown, label: string): PeerRole | null => {
  if (value === undefined || value === null) return null;
  if (value !== "sandbox") throw new Error(`${label} must be "sandbox" when present.`);
  return value;
};

const parsePeer = (value: unknown, label: string): StoredPeer => {
  const peer = objectRecord(value, label);
  requireKeys(peer, ["nodeId", "name", "baseUrl", "addedAt"], label);
  return {
    nodeId: requiredString(peer.nodeId, `${label}.nodeId`),
    name: requiredString(peer.name, `${label}.name`),
    baseUrl: requiredString(peer.baseUrl, `${label}.baseUrl`),
    addedAt: isoTimestamp(peer.addedAt, `${label}.addedAt`),
    // Rows written before peers paired have no secret: an unpaired peer (Directly Usable, no migration).
    peerSecret: peer.peerSecret === undefined || peer.peerSecret === null ? null : requiredString(peer.peerSecret, `${label}.peerSecret`),
    // Rows written before roles existed have none: a normal peer (Directly Usable, no migration).
    role: parseRole(peer.role, `${label}.role`),
  };
};

const toRow = (peer: StoredPeer): Record<string, string> => ({
  nodeId: peer.nodeId,
  name: peer.name,
  baseUrl: peer.baseUrl,
  addedAt: peer.addedAt,
  ...(peer.peerSecret ? { peerSecret: peer.peerSecret } : {}),
  ...(peer.role ? { role: peer.role } : {}),
});

/**
 * `<data>/remote-collaboration/peers.json` (`{ "peers": [...] }`), read with exact keys and written exactly
 * with the store's atomic JSON write, file mode 0600 (it holds peer secrets, NA-10). A missing file has no peers; a
 * file that cannot be read is reported and never rewritten. Only `PeerDirectory` uses it.
 */
export class PeerStore {
  constructor(private readonly config: AppDataDirSource) {}

  filePath(): string { return remoteCollaborationSettingsPath(this.config, "peers.json"); }

  async read(): Promise<readonly StoredPeer[]> {
    const raw = objectRecord(await readJsonFile<unknown>(this.filePath(), { peers: [] }), "peers.json");
    return Object.freeze(requiredArray(raw.peers, "peers").map((peer, index) => Object.freeze(parsePeer(peer, `peers[${index}]`))));
  }

  async write(peers: readonly StoredPeer[]): Promise<void> {
    await writeJsonFile(this.filePath(), { peers: peers.map((peer, index) => toRow(parsePeer(peer, `peers[${index}]`))) }, { mode: 0o600 });
  }
}
