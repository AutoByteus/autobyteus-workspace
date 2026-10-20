import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";

export { REMOTE_REFUSAL };

/**
 * The texts an agent reads for refusals of remote collaboration (REQ-109); the codes are the one list next to
 * the channel port. A refusal that comes from the peer keeps the peer's code; this node words it for its
 * own agent, naming the peer by this owner's label.
 */
/** Texts for refusals decided on this node (before anything is sent). */
export const localRefusalText = Object.freeze({
  off: () => REMOTE_ROOT_REFUSAL_TEXT.off,
  peerNotRegistered: (node: string) =>
    `No peer node named "${node}" is registered on this node, so nothing was sent. Use a node name the user gave you.`,
});

/** The agent-facing text for a refusal answered by (or about) the peer named `node`. */
export const peerRefusalText = (node: string, code: string, detail: string): string => {
  switch (code) {
    case REMOTE_REFUSAL.OFF: return `Remote collaboration is turned off on node "${node}", so it refused the request.`;
    case REMOTE_REFUSAL.PEER_NOT_REGISTERED: return `Node "${node}" does not have this node registered as a peer, so it refused the request.`;
    case REMOTE_REFUSAL.PEER_UNREACHABLE: return `Node "${node}" could not be reached (${detail}).`;
    case REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH:
      return `The server at node "${node}"'s address is not the node that was registered (identity mismatch), so nothing was sent.`;
    case REMOTE_REFUSAL.AGENT_NOT_PUBLISHED: return `Node "${node}" has no published Agent at that address.`;
    case REMOTE_REFUSAL.AGENT_CANNOT_RUN: return `The published Agent on node "${node}" cannot run there: ${detail}`;
    case REMOTE_REFUSAL.TARGET_NOT_PERMITTED: return `Node "${node}" refused the message: that run is not linked with the sender.`;
    case REMOTE_REFUSAL.TARGET_NOT_FOUND: return `That run no longer exists on node "${node}".`;
    default: return `Node "${node}" refused the request: ${detail}`;
  }
};
