// Historical, migration-only (autobyteus-661). The shape of `<data>/remote-collaboration/peers.json` as released from
// autobyteus-437 (shared peer secrets) through autobyteus-581 (the sandbox mark, released in v1.5.15-beta.3): what
// `PeerStore` wrote before node keys. Owned by released app-data migrations; current runtime must not import it.

/** The sandbox mark the released store wrote (`role`), the only value it knew. */
export const RELEASED_PEER_ROLE_SANDBOX = "sandbox";

/** One released row: `peerSecret` only once the two nodes paired; `role` absent, `null` or `"sandbox"`. */
export type ReleasedPeerRow = Readonly<{
  nodeId: string;
  name: string;
  baseUrl: string;
  addedAt: string;
  peerSecret?: string | null;
  role?: typeof RELEASED_PEER_ROLE_SANDBOX | null;
}>;

const RELEASED_KEYS = new Set(["nodeId", "name", "baseUrl", "addedAt", "peerSecret", "role"]);

// The released reader's string and timestamp rules (`requiredString`, `isoTimestamp` as of v1.5.15-beta.3).
const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value === value.trim();
const isTimestamp = (value: unknown): value is string => nonEmptyString(value)
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));

/**
 * The released writer's row, read strictly as it was released (exact keys, `peerSecret` a non-empty string or
 * absent/null, `role` `"sandbox"` or absent/null). Anything else is not a released row.
 */
export const isReleasedPeerRow = (value: unknown): value is ReleasedPeerRow => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !RELEASED_KEYS.has(key))) return false;
  if (!nonEmptyString(row.nodeId) || !nonEmptyString(row.name) || !nonEmptyString(row.baseUrl) || !isTimestamp(row.addedAt)) return false;
  if (row.peerSecret !== undefined && row.peerSecret !== null && !nonEmptyString(row.peerSecret)) return false;
  return row.role === undefined || row.role === null || row.role === RELEASED_PEER_ROLE_SANDBOX;
};
