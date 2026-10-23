import type { RemoteChannelRefusal } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { TransportFailureReason } from "../channel/transport-failure-reason.js";

/**
 * A refusal about a peer as this node's client produced it: the port's refusal plus, for `PEER_UNREACHABLE` caused by
 * the transport, the classified `reason` (one-nodes-tab REQ-707). The reason is for the Nodes page; the agents read
 * the refusal's message, unchanged.
 */
export type PeerRefusal = RemoteChannelRefusal & Readonly<{ reason?: TransportFailureReason }>;
