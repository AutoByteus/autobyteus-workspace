import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { availableCollaboratorEntry, type AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { findProcessRemoteDiscoveryChannel, type RemoteDiscoveryChannel } from "../../agent-collaboration/execution/remote/remote-discovery-channel.js";
import { isAgentDiscoveryRefusal, remoteCollaborationOff, requireDiscoveryContext, type AgentDiscoveryRefusal } from "./agent-discovery-refusal.js";

export const LIST_AVAILABLE_AGENTS_TOOL_NAME = "list_available_agents";

/** The same wording on every runtime (local tool and Agent Tools MCP); wording authority §6 (autobyteus-261 DEC-406). */
export const LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION =
  "List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description (when it has one). With node, list what that peer node offers for delegation instead; use an address from that list as recipient_address in delegate_task with the same node. This tool is read-only.";

export const LIST_AVAILABLE_AGENTS_NODE_DESCRIPTION =
  "Optional: the name of a peer node registered on this node. Without it, this node's agents and agent teams are listed.";

export type ListAvailableAgentsResult = Readonly<{ agents: readonly AvailableCollaboratorEntry[] }>;

export const buildListAvailableAgentsParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "node", type: ParameterType.STRING, description: LIST_AVAILABLE_AGENTS_NODE_DESCRIPTION, required: false }),
]);

/**
 * Without `node`, the sender's root answers (DS-001), as before. With `node` (autobyteus-261 DS-002), what that
 * peer offers for delegation, through `RemoteDiscoveryChannel`; a refusal has the same texts as `delegate_task`.
 * The handler adds nothing and writes nothing.
 */
export const listAvailableAgentsFor = async (
  collaboration: MemberCollaborationContext | null | undefined,
  args: Readonly<Record<string, unknown>> = {},
  discovery: RemoteDiscoveryChannel | null = findProcessRemoteDiscoveryChannel(),
): Promise<ListAvailableAgentsResult | AgentDiscoveryRefusal> => {
  const lister = requireDiscoveryContext(collaboration, LIST_AVAILABLE_AGENTS_TOOL_NAME);
  if (args.node === undefined) {
    return Object.freeze({ agents: Object.freeze((await lister()).map(availableCollaboratorEntry)) });
  }
  if (typeof args.node !== "string" || !args.node.trim()) {
    return Object.freeze({ accepted: false, code: "VALIDATION_ERROR",
      message: "node must be the name of a peer node registered on this node; leave it out to list this node's agents and agent teams." });
  }
  if (!discovery) return remoteCollaborationOff();
  const agents = await discovery.listAvailableAgents(args.node.trim());
  return isAgentDiscoveryRefusal(agents) ? agents : Object.freeze({ agents });
};
