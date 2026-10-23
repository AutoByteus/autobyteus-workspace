import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  findProcessRemoteDiscoveryChannel,
  type AvailableNode,
  type RemoteDiscoveryChannel,
} from "../../agent-collaboration/execution/remote/remote-discovery-channel.js";
import { isAgentDiscoveryRefusal, remoteCollaborationOff, requireDiscoveryContext, type AgentDiscoveryRefusal } from "./agent-discovery-refusal.js";

export const LIST_AVAILABLE_NODES_TOOL_NAME = "list_available_nodes";

/** The same wording on every runtime (local tool and Agent Tools MCP); autobyteus-261 DEC-406. */
export const LIST_AVAILABLE_NODES_TOOL_DESCRIPTION =
  "List the peer nodes registered on this node, each with its name and status: available (it takes work from this node now) or unavailable. Use the name as node in list_available_agents and delegate_task; for an unavailable node, list_available_agents with that node says why. This read-only tool takes no arguments.";

export type ListAvailableNodesResult = Readonly<{ nodes: readonly AvailableNode[] }>;

export const buildListAvailableNodesParameterSchema = (): ParameterSchema => new ParameterSchema([]);

/**
 * The opt-in `list_available_nodes` (autobyteus-261 DS-001, DEC-401): this node's registered peers with their status
 * now, through `RemoteDiscoveryChannel`; the "turned off" refusal when this node's switch is off. Available to the
 * same senders as `list_available_agents`.
 */
export const listAvailableNodesFor = async (
  collaboration: MemberCollaborationContext | null | undefined,
  discovery: RemoteDiscoveryChannel | null = findProcessRemoteDiscoveryChannel(),
): Promise<ListAvailableNodesResult | AgentDiscoveryRefusal> => {
  requireDiscoveryContext(collaboration, LIST_AVAILABLE_NODES_TOOL_NAME);
  if (!discovery) return remoteCollaborationOff();
  const nodes = await discovery.listNodes();
  return isAgentDiscoveryRefusal(nodes) ? nodes : Object.freeze({ nodes });
};
