import type { RemoteAgentStatus } from "@autobyteus/agent-presentation-contracts";

/** An entry's state: its entry agent's (an Agent's own agent, a Team's coordinator); starting counts as running (DEC-009). */
export type RunningAgentState = "running" | "idle" | "error";

/** The `state` filter of `list_running_agents` (REQ-005). */
export const RUNNING_AGENT_STATE_FILTERS: readonly RunningAgentState[] = Object.freeze(["running", "idle"]);

/**
 * One running run a person started, as an agent reads it (REQ-002, DEC-013): the IDs it messages with, named as
 * `delegate_task`'s result names them (without `target_`). An Agent run is messaged by `agent_run_id`; a Team run by its
 * `team_coordinator_agent_run_id`. `workspace` and `state` of a Team are its coordinator's. A field without a value is
 * left out (the autobyteus-260 rule); `node` is added by the node that asked a peer. Never any content, title or member.
 * The one shape of this node's list, of a peer's answer on the wire and of the list an agent gets for a peer.
 */
export type RunningAgentEntry =
  | Readonly<{
      kind: "agent"; name: string; address?: string; agent_run_id: string; workspace?: string; state: RunningAgentState;
      started_at?: string; project?: string; node?: string;
    }>
  | Readonly<{
      kind: "agent_team"; name: string; address?: string; team_run_id: string; team_coordinator_agent_run_id: string;
      workspace?: string; state: RunningAgentState; started_at?: string; project?: string; node?: string;
    }>;

/** The fields an entry may have, and no other (the peer client's strict reader, QR-002). */
export const RUNNING_AGENT_ENTRY_FIELDS: Readonly<Record<RunningAgentEntry["kind"], ReadonlySet<string>>> = Object.freeze({
  agent: new Set(["kind", "name", "address", "agent_run_id", "workspace", "state", "started_at", "project"]),
  agent_team: new Set(["kind", "name", "address", "team_run_id", "team_coordinator_agent_run_id", "workspace", "state", "started_at", "project"]),
});

/** An entry agent's live status as the entry's state. */
export const runningAgentStateOf = (status: RemoteAgentStatus): RunningAgentState =>
  status === "idle" ? "idle" : status === "error" ? "error" : "running";

type Common = Readonly<{
  name: string; address?: string | null; workspace?: string | null; state: RunningAgentState; startedAt?: string | null; project?: string | null;
}>;

const address = (common: Common) => common.address ? { address: common.address } : {};
const trailing = (common: Common) => Object.freeze({
  ...(common.workspace ? { workspace: common.workspace } : {}),
  state: common.state,
  ...(common.startedAt ? { started_at: common.startedAt } : {}),
  ...(common.project ? { project: common.project } : {}),
});

/** The one builder of an entry (fields in the documented order; absent values left out). */
export const runningAgentEntry = (input: (Common & Readonly<{ kind: "agent"; agentRunId: string }>)
  | (Common & Readonly<{ kind: "agent_team"; teamRunId: string; coordinatorAgentRunId: string }>)): RunningAgentEntry =>
  input.kind === "agent"
    ? Object.freeze({ kind: "agent" as const, name: input.name, ...address(input), agent_run_id: input.agentRunId, ...trailing(input) })
    : Object.freeze({ kind: "agent_team" as const, name: input.name, ...address(input), team_run_id: input.teamRunId,
      team_coordinator_agent_run_id: input.coordinatorAgentRunId, ...trailing(input) });

/** The entry as an agent of the node that asked reads it: with the peer's name as `node`. */
export const onNode = (entry: RunningAgentEntry, node: string): RunningAgentEntry => Object.freeze({ ...entry, node });
