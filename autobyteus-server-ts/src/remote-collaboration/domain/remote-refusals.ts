import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { RemoteRefusalTarget } from "./remote-requests.js";

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
    `No peer node named "${node}" is registered on this node, so nothing was sent. Use a node name the user gave you; if you have list_available_nodes, it lists them.`,
});

/**
 * The agent-facing text for a refusal answered by (or about) the peer named `node`. `detail` is the peer's
 * message (for `AGENT_NOT_FOUND`, the address it found nothing at); `target` is the target definition on the peer
 * (its kind and name), which this node knows only by its address (autobyteus-261 DEC-407).
 */
export const peerRefusalText = (node: string, code: string, detail: string, target?: RemoteRefusalTarget): string => {
  switch (code) {
    case REMOTE_REFUSAL.OFF: return `Remote collaboration is turned off on node "${node}", so it refused the request.`;
    case REMOTE_REFUSAL.PEER_NOT_REGISTERED: return `Node "${node}" does not have this node registered as a peer, so it refused the request.`;
    case REMOTE_REFUSAL.PEER_UNREACHABLE: return `Node "${node}" could not be reached (${detail}).`;
    case REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH:
      return `The server at node "${node}"'s address is not the node that was registered (identity mismatch), so nothing was sent.`;
    case REMOTE_REFUSAL.AGENT_NOT_FOUND:
      return `Node "${node}" has no Agent or Agent Team at ${detail} that can be delegated to. If you have list_available_agents, call it with this node to see what it offers.`;
    case REMOTE_REFUSAL.NO_DEFAULT_RUNTIME:
      // B's reason names the target's kind ("target agent" / "target agent team", REQ-302); A adds the node.
      return `${detail} on node "${node}".`;
    case REMOTE_REFUSAL.AGENT_CANNOT_RUN: {
      const subject = !target ? "The Agent at that address" : target.kind === "agent_team" ? `The Agent Team ${target.name}` : `The Agent ${target.name}`;
      return `${subject} on node "${node}" cannot run there: ${detail}`;
    }
    case REMOTE_REFUSAL.TARGET_NOT_PERMITTED: return `Node "${node}" refused the message: that run is not linked with the sender.`;
    case REMOTE_REFUSAL.TARGET_NOT_FOUND: return `That run no longer exists on node "${node}".`;
    default: return `Node "${node}" refused the request: ${detail}`;
  }
};
