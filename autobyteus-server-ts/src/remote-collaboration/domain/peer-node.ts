/** Whose node a peer is (contract §1): `own` (this person's) or `teammate` (someone else's). Never grants control. */
export type PeerRelation = "own" | "teammate";

/**
 * A node paired with this node (DEC-101; autobyteus-661 contract §1). `nodeId` is the peer's node ID; `name` is this
 * owner's label for it (unique here, the value agents pass as `node`, shown in headers); `address` is where this node
 * reaches it; `machine` and `account` are the private network's stable machine ID and the account that added it (both
 * `null` when paired by plain address); `relation` is whose node it is (`null` for a pair made before node keys);
 * `sandbox` marks a sandbox node this node created (autobyteus-581).
 * `paired`: this node holds the peer's public node key. A pair made before node keys has none: it shows "Pair again"
 * and its requests are refused until it pairs again. The key itself never leaves `PeerDirectory`.
 * `<data>/remote-collaboration/peers.json` holds them (owner: `PeerDirectory`).
 */
export type PeerNode = Readonly<{
  nodeId: string;
  name: string;
  address: string;
  machine: string | null;
  account: string | null;
  relation: PeerRelation | null;
  sandbox: boolean;
  addedAt: string;
  paired: boolean;
}>;
