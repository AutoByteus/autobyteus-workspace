import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import {
  isoTimestamp,
  objectRecord,
  requiredArray,
  requiredString,
  requireKeys,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import type { PeerNode } from "../domain/peer-node.js";
import { remoteCollaborationSettingsPath, type AppDataDirSource } from "./settings-file-schema.js";

const parsePeer = (value: unknown, label: string): PeerNode => {
  const peer = objectRecord(value, label);
  requireKeys(peer, ["nodeId", "name", "baseUrl", "addedAt"], label);
  return {
    nodeId: requiredString(peer.nodeId, `${label}.nodeId`),
    name: requiredString(peer.name, `${label}.name`),
    baseUrl: requiredString(peer.baseUrl, `${label}.baseUrl`),
    addedAt: isoTimestamp(peer.addedAt, `${label}.addedAt`),
  };
};

/**
 * `<data>/remote-collaboration/peers.json` (`{ "peers": [...] }`), read with exact keys and written exactly
 * with the store's atomic JSON write. A missing file has no peers; a file that cannot be read is reported and
 * never rewritten. Only `PeerDirectory` uses it.
 */
export class PeerStore {
  constructor(private readonly config: AppDataDirSource) {}

  filePath(): string { return remoteCollaborationSettingsPath(this.config, "peers.json"); }

  async read(): Promise<readonly PeerNode[]> {
    const raw = objectRecord(await readJsonFile<unknown>(this.filePath(), { peers: [] }), "peers.json");
    return Object.freeze(requiredArray(raw.peers, "peers").map((peer, index) => Object.freeze(parsePeer(peer, `peers[${index}]`))));
  }

  async write(peers: readonly PeerNode[]): Promise<void> {
    await writeJsonFile(this.filePath(), { peers: peers.map((peer, index) => parsePeer(peer, `peers[${index}]`)) });
  }
}
