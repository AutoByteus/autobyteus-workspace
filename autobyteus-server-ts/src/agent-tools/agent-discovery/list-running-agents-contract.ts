import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { PeerDiscoveryChannel } from "../../agent-collaboration/execution/remote/peer-discovery-channel.js";
import { RUNNING_AGENT_STATE_FILTERS, type RunningAgentEntry } from "../../agent-collaboration/running/running-agent-entry.js";
import {
  getProcessRunningAgentsListing,
  matchesRunningAgentsFilters,
  type RunningAgentsFilters,
  type RunningAgentsListing,
} from "../../agent-collaboration/running/running-agents-listing.js";
import { isAgentDiscoveryRefusal, requireDiscoveryContext, type AgentDiscoveryRefusal } from "./agent-discovery-refusal.js";

export const LIST_RUNNING_AGENTS_TOOL_NAME = "list_running_agents";

/** The same wording on every runtime (local tool and Agent Tools MCP); REQ-012. */
export const LIST_RUNNING_AGENTS_TOOL_DESCRIPTION =
  "List the agents and agent teams that a person started and that run now, so you can message them; this list is for messages only: to start work, use delegate_task. Your own run and the task agents that delegate_task starts are not listed. Each entry has its kind (agent or agent_team), name, address, state (running, idle or error) and, when it has them, started_at, project (the Project it was started under) and workspace (the folder it works in, which tells you which project's work it does). Message an agent with send_message_to and its agent_run_id; message an agent team through its coordinator: send_message_to with its team_coordinator_agent_run_id. With node, list what runs on that peer node: each entry then has node, and you pass the same node to send_message_to. Stopped runs are not listed, and a message never wakes them. This tool is read-only.";

export const LIST_RUNNING_AGENTS_NODE_DESCRIPTION =
  "Optional: the name of a peer node registered on this node. Without it, what runs on this node is listed.";
export const LIST_RUNNING_AGENTS_ADDRESS_DESCRIPTION =
  "Optional: only the runs of the agent or agent team at this catalog address (as list_available_agents shows it, on the same node).";
export const LIST_RUNNING_AGENTS_STATE_DESCRIPTION =
  "Optional: only the runs in this state: running (working or starting) or idle (waiting for a message).";

export type ListRunningAgentsResult = Readonly<{ agents: readonly RunningAgentEntry[] }>;

export const buildListRunningAgentsParameterSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({ name: "node", type: ParameterType.STRING, description: LIST_RUNNING_AGENTS_NODE_DESCRIPTION, required: false }),
  new ParameterDefinition({ name: "address", type: ParameterType.STRING, description: LIST_RUNNING_AGENTS_ADDRESS_DESCRIPTION, required: false }),
  new ParameterDefinition({ name: "state", type: ParameterType.ENUM, description: LIST_RUNNING_AGENTS_STATE_DESCRIPTION, required: false,
    enumValues: [...RUNNING_AGENT_STATE_FILTERS] }),
]);

const invalid = (message: string): AgentDiscoveryRefusal => Object.freeze({ accepted: false, code: "VALIDATION_ERROR", message });
const given = (value: unknown): boolean => value !== undefined && value !== null;

/** The arguments, checked: `node` and the filters, or the refusal that says which one is wrong. */
const argumentsOf = (args: Readonly<Record<string, unknown>>): Readonly<{ node: string | null; filters: RunningAgentsFilters }> | AgentDiscoveryRefusal => {
  if (given(args.node) && (typeof args.node !== "string" || !args.node.trim())) {
    return invalid("node must be the name of a peer node registered on this node; leave it out to list what runs on this node.");
  }
  if (given(args.address) && (typeof args.address !== "string" || !args.address.trim().startsWith("/"))) {
    return invalid("address must be a catalog address beginning with '/'; leave it out to list every run.");
  }
  if (given(args.state) && !(RUNNING_AGENT_STATE_FILTERS as readonly unknown[]).includes(args.state)) {
    return invalid("state must be running or idle; leave it out to list every run.");
  }
  return Object.freeze({
    node: given(args.node) ? (args.node as string).trim() : null,
    filters: Object.freeze({
      ...(given(args.address) ? { address: (args.address as string).trim() } : {}),
      ...(given(args.state) ? { state: args.state as RunningAgentsFilters["state"] } : {}),
    }),
  });
};

/**
 * The opt-in `list_running_agents` (autobyteus-492 DS-001, DS-002), for the same senders as `list_available_agents`. Without
 * `node`, this node's `RunningAgentsListing` (the caller's own run left out); with `node`, that peer's list through
 * the host's `PeerDiscoveryChannel` (autobyteus-500 FU-011: passed in, `REMOTE_COLLABORATION_OFF_DISCOVERY` when remote
 * collaboration is off; the same refusals as `list_available_agents` with `node`), filtered by the same rule. Reads only.
 */
export const listRunningAgentsFor = async (
  context: MemberExecutionContext | null | undefined,
  args: Readonly<Record<string, unknown>>,
  discovery: PeerDiscoveryChannel,
  sources: Readonly<{ listing?: () => Pick<RunningAgentsListing, "list"> }> = {},
): Promise<ListRunningAgentsResult | AgentDiscoveryRefusal> => {
  requireDiscoveryContext(context?.collaboration, LIST_RUNNING_AGENTS_TOOL_NAME);
  const checked = argumentsOf(args);
  if (isAgentDiscoveryRefusal(checked)) return checked;
  if (checked.node === null) {
    const listing = (sources.listing ?? getProcessRunningAgentsListing)();
    return Object.freeze({ agents: await listing.list({ caller: context!.identity.root, filters: checked.filters }) });
  }
  const agents = await discovery.listRunningAgents(checked.node);
  return isAgentDiscoveryRefusal(agents) ? agents
    : Object.freeze({ agents: Object.freeze(agents.filter((entry) => matchesRunningAgentsFilters(entry, checked.filters))) });
};
