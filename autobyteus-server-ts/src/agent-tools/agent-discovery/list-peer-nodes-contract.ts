import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  findProcessPeerDiscoveryChannel,
  type PeerNodeStatus,
  type PeerDiscoveryChannel,
} from "../../agent-collaboration/execution/remote/peer-discovery-channel.js";
import { isAgentDiscoveryRefusal, remoteCollaborationOff, requireDiscoveryContext, type AgentDiscoveryRefusal } from "./agent-discovery-refusal.js";

export const LIST_PEER_NODES_TOOL_NAME = "list_peer_nodes";

/** The same wording on every runtime (local tool and Agent Tools MCP); autobyteus-261 DEC-406. */
export const LIST_PEER_NODES_TOOL_DESCRIPTION =
  "List the peer nodes registered on this node, each with its name and status: available (it takes work from this node now) or unavailable. Use the name as node in list_available_agents and delegate_task; for an unavailable node, list_available_agents with that node says why. This read-only tool takes no arguments.";

export type ListPeerNodesResult = Readonly<{ nodes: readonly PeerNodeStatus[] }>;

export const buildListPeerNodesParameterSchema = (): ParameterSchema => new ParameterSchema([]);

/**
 * The opt-in `list_peer_nodes` (autobyteus-261 DS-001, DEC-401): this node's registered peers with their status
 * now, through `PeerDiscoveryChannel`; the "turned off" refusal when this node's switch is off. Available to the
 * same senders as `list_available_agents`.
 */
export const listPeerNodesFor = async (
  collaboration: MemberCollaborationContext | null | undefined,
  discovery: PeerDiscoveryChannel | null = findProcessPeerDiscoveryChannel(),
): Promise<ListPeerNodesResult | AgentDiscoveryRefusal> => {
  requireDiscoveryContext(collaboration, LIST_PEER_NODES_TOOL_NAME);
  if (!discovery) return remoteCollaborationOff();
  const nodes = await discovery.listPeerNodes();
  return isAgentDiscoveryRefusal(nodes) ? nodes : Object.freeze({ nodes });
};
