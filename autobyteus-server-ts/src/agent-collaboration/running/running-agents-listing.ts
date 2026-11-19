import type { RunOwnAgentsReader } from "../../run-history/store/run-own-agents-reader.js";
import type { CatalogAddressMap } from "../collaborators/catalog-address-map.js";
import { sameRootExecutionIdentity, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runningAgentEntry, runningAgentStateOf, type RunningAgentEntry, type RunningAgentState } from "./running-agent-entry.js";
import type { RunningAgents } from "./running-agents.js";

/** `list_running_agents`'s filters (REQ-005): a catalog address, and the entry's state. */
export type RunningAgentsFilters = Readonly<{ address?: string; state?: Exclude<RunningAgentState, "error"> }>;

/** The one filter rule, for this node's list and for a peer's answer (the peer is asked for its whole list). */
export const matchesRunningAgentsFilters = (entry: RunningAgentEntry, filters: RunningAgentsFilters): boolean =>
  (!filters.state || entry.state === filters.state) && (!filters.address || entry.address === filters.address);

/**
 * The listing rule of `list_running_agents` (autobyteus-492 DS-001; on a peer, its answer to DS-002): the live Agent and Team
 * runs of this node that a person started (their own file has no `delegatedFrom`) and whose entry agent runs now (an
 * Agent's own agent; a Team's coordinator), except the caller's own run. Org runs, Team members and delegated runs are
 * never entries (REQ-003, DEC-004). Each entry is built from the run's own file, the live status, this node's catalog
 * (name and address, as `list_available_agents` shows them) and the Project the run was started under. Reads only.
 */
export class RunningAgentsListing {
  constructor(private readonly dependencies: Readonly<{
    running: Pick<RunningAgents, "liveRoots" | "statusesOf">;
    runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">;
    /** An Agent definition's name; `null` when it no longer exists. */
    agentName(definitionId: string): Promise<string | null>;
    /** This node's catalog addresses (the node-wide map `list_available_agents` and a peer's delegation use). */
    catalogAddresses(): Promise<Pick<CatalogAddressMap, "addressFor">>;
    /** The Project the run was started under; `null` when none. */
    projectOf(root: Readonly<{ kind: "agent" | "agent_team"; runId: string }>): Promise<Readonly<{ name: string }> | null>;
  }>) {}

  /** The entries, in the order the roots went live; `caller` is the asking agent's own run (left out), `null` for a peer. */
  async list(input: Readonly<{ caller: RootExecutionIdentity | null; filters?: RunningAgentsFilters }>): Promise<readonly RunningAgentEntry[]> {
    const filters = input.filters ?? {};
    const candidates = this.dependencies.running.liveRoots().filter((root) => root.rootSubjectKind !== "agent_org"
      && !(input.caller && sameRootExecutionIdentity(root, input.caller)));
    if (!candidates.length) return Object.freeze([]);
    const addresses = await this.dependencies.catalogAddresses();
    const entries: RunningAgentEntry[] = [];
    for (const root of candidates) {
      const entry = await this.entryOf(root, addresses).catch((error: unknown) => {
        // DESIGN.md rule 7: one run's unreadable file leaves that run out, named; the list goes on.
        console.warn(`Running run '${root.rootSubjectKind}:${root.rootRunId}' is left out of the list: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      if (entry && matchesRunningAgentsFilters(entry, filters)) entries.push(entry);
    }
    return Object.freeze(entries);
  }

  private async entryOf(root: RootExecutionIdentity, addresses: Pick<CatalogAddressMap, "addressFor">): Promise<RunningAgentEntry | null> {
    const facts = await this.dependencies.runFiles.listingFactsOf(root);
    if (!facts?.startedByPerson) return null;
    const entryAgentRunId = facts.kind === "agent" ? root.rootRunId : facts.coordinatorAgentRunId;
    const live = this.dependencies.running.statusesOf(root).find((agent) => agent.agentRunId === entryAgentRunId);
    if (!live) return null;
    const kind = facts.kind;
    const name = kind === "agent" ? await this.dependencies.agentName(facts.definitionId) ?? facts.definitionId : facts.definitionName;
    const common = {
      name,
      address: addresses.addressFor({ kind, definitionId: facts.definitionId }),
      workspace: facts.workspace,
      state: runningAgentStateOf(live.status),
      startedAt: facts.startedAt,
      project: (await this.dependencies.projectOf({ kind, runId: root.rootRunId }))?.name ?? null,
    };
    return facts.kind === "agent"
      ? runningAgentEntry({ ...common, kind: "agent", agentRunId: root.rootRunId })
      : runningAgentEntry({ ...common, kind: "agent_team", teamRunId: root.rootRunId, coordinatorAgentRunId: facts.coordinatorAgentRunId });
  }
}

let processListing: Pick<RunningAgentsListing, "list"> | null = null;

/**
 * Binds the process's listing once at composition, as `PeerDiscoveryChannel` is bound, for the `list_running_agents` tool on
 * every runtime (the tool definitions are registered without a composition). Bound before any run starts.
 */
export const bindProcessRunningAgentsListing = (listing: Pick<RunningAgentsListing, "list">): (() => void) => {
  if (!listing) throw new Error("A process RunningAgentsListing is required.");
  if (processListing) throw new Error("The process RunningAgentsListing is already initialized.");
  processListing = listing;
  return () => { if (processListing === listing) processListing = null; };
};

/** The process's listing; a process that runs agents composes it, so a missing one is a wiring error and fails loudly. */
export const getProcessRunningAgentsListing = (): Pick<RunningAgentsListing, "list"> => {
  if (!processListing) throw new Error("list_running_agents is not available: the running-agents listing is not composed in this process.");
  return processListing;
};
