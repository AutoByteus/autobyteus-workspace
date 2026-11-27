import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import { isReleasedPeerRow, RELEASED_PEER_ROLE_SANDBOX, type ReleasedPeerRow } from "../../frozen/released-peers-file.js";

const MIGRATION_ID = "20261127_peers_to_node_keys";
const PEERS_ITEM_ID = "remote-collaboration/peers";
const SWITCH_ITEM_ID = "env/ENABLE_REMOTE_COLLABORATION";
/** The deleted collaboration switch (autobyteus-661 D-4). */
const SWITCH_KEY = "ENABLE_REMOTE_COLLABORATION";

/**
 * The row this migration writes, the current `PeerStore` shape for a pair made before node keys: where this node
 * reaches the peer (`address`, the released `baseUrl` value) and the sandbox mark. No `publicKey`: the peer shows
 * "Pair again" and every signed request of it is refused until it pairs again (D-3).
 */
type CurrentPeerRow = Readonly<{ nodeId: string; name: string; address: string; addedAt: string; sandbox?: true }>;

/** A row already in the current shape: `address`, and none of the released fields. */
const isCurrentRow = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.address === "string" && typeof row.nodeId === "string"
    && !("baseUrl" in row) && !("peerSecret" in row) && !("role" in row);
};

const convertRow = (row: ReleasedPeerRow): CurrentPeerRow => Object.freeze({
  nodeId: row.nodeId,
  name: row.name,
  address: row.baseUrl,
  addedAt: row.addedAt,
  ...(row.role === RELEASED_PEER_ROLE_SANDBOX ? { sandbox: true as const } : {}),
});

type ReadOutcome = { kind: "absent" } | { kind: "read"; raw: string; mode: number };

const readFile = async (filePath: string): Promise<ReadOutcome> => {
  try {
    const [raw, stat] = await Promise.all([fs.readFile(filePath, "utf-8"), fs.stat(filePath)]);
    return { kind: "read", raw, mode: stat.mode & 0o777 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" };
    throw error;
  }
};

/** Writes atomically with the given file mode: a temporary file in the same folder, then a rename over the target. */
const writeAtomically = async (filePath: string, content: string, mode: number): Promise<void> => {
  const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { encoding: "utf-8", mode });
    await fs.chmod(temporary, mode);
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
};

/** The `.env` text without the switch's assignment lines (each with its line ending); every other byte unchanged. */
const withoutSwitch = (content: string): Readonly<{ content: string; removed: number }> => {
  const lines = content.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter((line) => line.length > 0) ?? [];
  const kept = lines.filter((line) => /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line)?.[1] !== SWITCH_KEY);
  return { content: kept.join(""), removed: lines.length - kept.length };
};

const failed = (itemId: string, filePath: string, message: string): AppDataMigrationItemDetail =>
  ({ itemId, filePath, status: "FAILED", message });

/**
 * autobyteus-661 (D-2…D-4, design § Persisted Data): pairings move from shared secrets to node keys.
 * - `remote-collaboration/peers.json`: each released row keeps `nodeId`, `name`, `addedAt`; `baseUrl` becomes
 *   `address` (same value); `peerSecret` is dropped; `role: "sandbox"` becomes `sandbox: true`, `role` absent or `null`
 *   leaves no mark. Rows already current are kept as they are. The file is rewritten atomically with its mode (0600).
 *   Recognition is by structure (the released classifier is frozen). A row in neither shape fails the file, which is
 *   then left untouched: the current reader refuses it and every peer request is refused; the rest of the node works.
 * - `<data>/.env`: the `ENABLE_REMOTE_COLLABORATION` assignment is deleted; every other byte stays.
 * No backup is kept on purpose: the released file holds the shared secrets this change retires, and the founder
 * accepted pairing again (D-3). Re-running is safe: a current file and a `.env` without the switch are skipped.
 */
export class PeersToNodeKeysMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Peers to node keys migration";
  readonly description = "Drops shared peer secrets (peers.json baseUrl → address, role → sandbox) and deletes ENABLE_REMOTE_COLLABORATION from .env.";
  readonly requiredOnStartup = true;

  constructor(private readonly appDataDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details = [await this.migratePeers(), await this.removeSwitch()];
    const failedDetails = details.filter((detail) => detail.status === "FAILED");
    const migratedCount = details.filter((detail) => detail.status === "MIGRATED").length;
    const skippedCount = details.filter((detail) => detail.status === "SKIPPED").length;
    return {
      status: failedDetails.length === 0 ? "SUCCEEDED" : failedDetails.length < details.length ? "SUCCEEDED_WITH_WARNINGS" : "FAILED",
      summary: { scannedCount: details.length, migratedCount, skippedCount, failedCount: failedDetails.length, details },
      errorMessage: failedDetails.length ? failedDetails.map((detail) => detail.message).join(" ") : null,
    };
  }

  private async migratePeers(): Promise<AppDataMigrationItemDetail> {
    const filePath = path.join(this.appDataDir, "remote-collaboration", "peers.json");
    try {
      const file = await readFile(filePath);
      if (file.kind === "absent") return { itemId: PEERS_ITEM_ID, filePath, status: "SKIPPED", message: "No peers file." };
      let value: unknown;
      try { value = JSON.parse(file.raw); } catch (error) {
        return failed(PEERS_ITEM_ID, filePath, `peers.json is not JSON (${error instanceof Error ? error.message : String(error)}); it was left as it is.`);
      }
      const rows = (value as { peers?: unknown } | null)?.peers;
      if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(rows)) {
        return failed(PEERS_ITEM_ID, filePath, "peers.json has no peers list; it was left as it is.");
      }
      let converted = 0;
      const next: unknown[] = [];
      for (const [index, row] of rows.entries()) {
        if (isReleasedPeerRow(row)) { next.push(convertRow(row)); converted += 1; continue; }
        if (isCurrentRow(row)) { next.push(row); continue; }
        return failed(PEERS_ITEM_ID, filePath, `peers.json row ${index} is in no known shape; the file was left as it is.`);
      }
      if (converted === 0) return { itemId: PEERS_ITEM_ID, filePath, status: "SKIPPED", message: "The peers are already current." };
      await writeAtomically(filePath, `${JSON.stringify({ peers: next }, null, 2)}\n`, file.mode || 0o600);
      return { itemId: PEERS_ITEM_ID, filePath, status: "MIGRATED",
        message: `${converted} peer(s) kept without their shared secret; each shows "Pair again".` };
    } catch (error) {
      return failed(PEERS_ITEM_ID, filePath, error instanceof Error ? error.message : String(error));
    }
  }

  private async removeSwitch(): Promise<AppDataMigrationItemDetail> {
    const filePath = path.join(this.appDataDir, ".env");
    try {
      const file = await readFile(filePath);
      if (file.kind === "absent") return { itemId: SWITCH_ITEM_ID, filePath, status: "SKIPPED", message: "No .env file." };
      const changed = withoutSwitch(file.raw);
      if (changed.removed === 0) return { itemId: SWITCH_ITEM_ID, filePath, status: "SKIPPED", message: `${SWITCH_KEY} is not set.` };
      await writeAtomically(filePath, changed.content, file.mode);
      return { itemId: SWITCH_ITEM_ID, filePath, status: "MIGRATED", message: `${SWITCH_KEY} was deleted.` };
    } catch (error) {
      return failed(SWITCH_ITEM_ID, filePath, error instanceof Error ? error.message : String(error));
    }
  }
}

export const PEERS_TO_NODE_KEYS_MIGRATION_ID = MIGRATION_ID;
