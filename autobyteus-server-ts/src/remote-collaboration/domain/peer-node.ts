/**
 * A node registered on this node for remote collaboration (DEC-101). `nodeId` is the peer's node ID,
 * pinned when the peer is paired; `name` is this owner's label for it (unique here, the
 * value agents pass as `node`, shown in headers); `baseUrl` is how this node reaches the peer.
 * `paired`: both nodes hold the pair's peer secret (node access model NA-9); a peer registered before peers paired
 * has none and is refused until it pairs again. The secret itself never leaves `PeerDirectory`.
 * `<data>/remote-collaboration/peers.json` holds them (owner: `PeerDirectory`).
 */
export type PeerNode = Readonly<{
  nodeId: string;
  name: string;
  baseUrl: string;
  addedAt: string;
  paired: boolean;
}>;
