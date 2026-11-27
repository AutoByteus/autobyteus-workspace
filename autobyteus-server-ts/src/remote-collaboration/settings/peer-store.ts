import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import {
  isoTimestamp,
  objectRecord,
  requiredArray,
  requiredString,
  requireKeys,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import type { PeerRelation } from "../domain/peer-node.js";
import { remoteCollaborationSettingsPath, type AppDataDirSource } from "./settings-file-schema.js";

/**
 * One row of `peers.json` (autobyteus-661 contract §1): the peer, its public node key (`null` for a pair made before
 * node keys), where this node reaches it, its private-network machine and account (`null` when paired by plain
 * address), whose node it is, and the sandbox mark.
 */
export type StoredPeer = Readonly<{
  nodeId: string;
  name: string;
  publicKey: string | null;
  address: string;
  machine: string | null;
  account: string | null;
  relation: PeerRelation | null;
  sandbox: boolean;
  addedAt: string;
}>;

const optionalString = (value: unknown, label: string): string | null =>
  value === undefined || value === null ? null : requiredString(value, label);

const parseRelation = (value: unknown, label: string): PeerRelation | null => {
  if (value === undefined || value === null) return null;
  if (value !== "own" && value !== "teammate") throw new Error(`${label} must be "own" or "teammate" when present.`);
  return value;
};

/**
 * A row read tolerantly (Data Migration Guideline §3): the fields this node uses, each checked; unknown fields are
 * ignored and dropped on the next write. `publicKey`, `machine`, `account` and `relation` absent mean a pair made
 * before node keys (the migration's rows); `sandbox` absent means no mark.
 */
const parsePeer = (value: unknown, label: string): StoredPeer => {
  const peer = objectRecord(value, label);
  requireKeys(peer, ["nodeId", "name", "address", "addedAt"], label);
  if (peer.sandbox !== undefined && typeof peer.sandbox !== "boolean") throw new Error(`${label}.sandbox must be a boolean when present.`);
  return {
    nodeId: requiredString(peer.nodeId, `${label}.nodeId`),
    name: requiredString(peer.name, `${label}.name`),
    publicKey: optionalString(peer.publicKey, `${label}.publicKey`),
    address: requiredString(peer.address, `${label}.address`),
    machine: optionalString(peer.machine, `${label}.machine`),
    account: optionalString(peer.account, `${label}.account`),
    relation: parseRelation(peer.relation, `${label}.relation`),
    sandbox: peer.sandbox === true,
    addedAt: isoTimestamp(peer.addedAt, `${label}.addedAt`),
  };
};

/** The exact row written: every field, `null` where unknown; `sandbox` only when set (contract §1, "absent otherwise"). */
const toRow = (peer: StoredPeer): Record<string, string | boolean | null> => ({
  nodeId: peer.nodeId,
  name: peer.name,
  publicKey: peer.publicKey,
  address: peer.address,
  machine: peer.machine,
  account: peer.account,
  relation: peer.relation,
  ...(peer.sandbox ? { sandbox: true } : {}),
  addedAt: peer.addedAt,
});

/**
 * `<data>/remote-collaboration/peers.json` (`{ "peers": [...] }`), written exactly with the store's atomic JSON write,
 * file mode 0600. A missing file has no peers; a file that cannot be read (for example a released file the migration
 * could not convert) is reported and never rewritten. Only `PeerDirectory` uses it.
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
