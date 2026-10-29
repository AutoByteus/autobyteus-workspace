/**
 * A node registered on this node for remote collaboration (DEC-101). `nodeId` is the peer's node ID,
 * pinned when the peer is added; `name` is this owner's label for it (unique here, the
 * value agents pass as `node`, shown in headers); `baseUrl` is how this node reaches the peer.
 * `<data>/remote-collaboration/peers.json` holds them (owner: `PeerDirectory`). No secret in slice 1.
 */
export type PeerNode = Readonly<{
  nodeId: string;
  name: string;
  baseUrl: string;
  addedAt: string;
}>;
