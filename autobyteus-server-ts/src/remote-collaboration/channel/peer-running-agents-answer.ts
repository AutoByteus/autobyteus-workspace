import {
  RUNNING_AGENT_ENTRY_FIELDS,
  RUNNING_AGENT_STATE_FILTERS,
  runningAgentEntry,
  type RunningAgentEntry,
} from "../../agent-collaboration/running/running-agent-entry.js";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const optionalText = (value: unknown): value is string | undefined => value === undefined || nonEmpty(value);
const isState = (value: unknown): value is RunningAgentEntry["state"] =>
  value === "error" || (RUNNING_AGENT_STATE_FILTERS as readonly unknown[]).includes(value);

/** One entry, read strictly: exactly its kind's fields, each of its type; anything else is `null`. */
const entryOf = (value: unknown): RunningAgentEntry | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (entry.kind !== "agent" && entry.kind !== "agent_team") return null;
  const allowed = RUNNING_AGENT_ENTRY_FIELDS[entry.kind];
  if (Object.keys(entry).some((key) => !allowed.has(key))) return null;
  if (!nonEmpty(entry.name) || !isState(entry.state)) return null;
  if (!optionalText(entry.workspace) || !optionalText(entry.started_at) || !optionalText(entry.project)) return null;
  if (entry.address !== undefined && !(nonEmpty(entry.address) && entry.address.startsWith("/"))) return null;
  const common = { name: entry.name, address: entry.address, workspace: entry.workspace, state: entry.state,
    startedAt: entry.started_at, project: entry.project };
  if (entry.kind === "agent") return nonEmpty(entry.agent_run_id) ? runningAgentEntry({ ...common, kind: "agent", agentRunId: entry.agent_run_id }) : null;
  return nonEmpty(entry.team_run_id) && nonEmpty(entry.team_coordinator_agent_run_id)
    ? runningAgentEntry({ ...common, kind: "agent_team", teamRunId: entry.team_run_id, coordinatorAgentRunId: entry.team_coordinator_agent_run_id })
    : null;
};

/**
 * A peer's running runs, read strictly (autobyteus-492 QR-002, as `availableAgentsOf` reads a peer's offer): this
 * reader, not the peer's entry builder, decides what a peer may send. Each entry has only its kind's fields
 * (`RUNNING_AGENT_ENTRY_FIELDS`); an entry with any other field (a title, content, members, `node`) or a missing or
 * mistyped one makes the whole answer malformed (`null`).
 */
export const runningAgentsOf = (agents: unknown): readonly RunningAgentEntry[] | null => {
  if (!Array.isArray(agents)) return null;
  const entries = agents.map(entryOf);
  return entries.some((entry) => entry === null) ? null : Object.freeze(entries as RunningAgentEntry[]);
};
