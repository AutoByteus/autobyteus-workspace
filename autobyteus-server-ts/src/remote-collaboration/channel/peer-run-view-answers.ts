import { agentPresentationMessageSchema, remoteAgentStatusSchema, type AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { RemoteAgentLaunch, RemoteAgentProjection, RemoteRunMembers, RemoteRunSummary } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { parseLaunchConfigurationSource } from "../../run-history/store/launch-configuration-source-schema.js";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Each agent's launch as a peer resolved or stored it (autobyteus-32 REQ-009), read strictly; `null` when malformed. */
export const remoteAgentLaunchesOf = (value: unknown): readonly RemoteAgentLaunch[] | null => {
  if (!Array.isArray(value)) return null;
  try {
    return Object.freeze(value.map((item: unknown, index): RemoteAgentLaunch => {
      const entry = record(item);
      if (!entry || !nonEmpty(entry.address) || !nonEmpty(entry.runtimeKind) || !nonEmpty(entry.llmModelIdentifier)) throw new Error("launch");
      return Object.freeze({ address: entry.address, runtimeKind: entry.runtimeKind, llmModelIdentifier: entry.llmModelIdentifier,
        source: parseLaunchConfigurationSource(entry.source, `launches[${index}].source`) });
    }));
  } catch {
    return null;
  }
};

/**
 * A peer's run summaries, read strictly (autobyteus-278): each run is an Agent or a Team run by ID, with a title or
 * `null`, statuses of known values and its agents' launches (SR-038; absent from a peer that does not send them).
 * Anything else makes the whole answer malformed (`null`).
 */
export const remoteRunSummariesOf = (answer: Readonly<Record<string, unknown>>): readonly RemoteRunSummary[] | null => {
  if (!Array.isArray(answer.runs)) return null;
  const runs = answer.runs.map((value: unknown): RemoteRunSummary | null => {
    const run = record(value);
    if (!run || (run.kind !== "agent" && run.kind !== "agent_team") || !nonEmpty(run.runId)) return null;
    if (run.title !== null && typeof run.title !== "string") return null;
    if (!Array.isArray(run.statuses)) return null;
    const statuses = run.statuses.map((entry: unknown) => {
      const status = record(entry);
      const parsed = remoteAgentStatusSchema.safeParse(status?.status);
      const count = status?.backgroundTasksRunning;
      return status && nonEmpty(status.agentRunId) && parsed.success && typeof count === "number" && Number.isSafeInteger(count) && count >= 0
        ? Object.freeze({ agentRunId: status.agentRunId, status: parsed.data, backgroundTasksRunning: count }) : null;
    });
    if (statuses.some((status) => status === null)) return null;
    const launches = run.launches === undefined ? Object.freeze([]) : remoteAgentLaunchesOf(run.launches);
    if (!launches) return null;
    // FU-003: a Team run's members (absent from an older peer); a malformed one is left out, not the summary.
    const team = run.kind === "agent_team" ? remoteRunMembersOf(run.team) : null;
    return Object.freeze({ kind: run.kind, runId: run.runId, title: run.title as string | null, ...(team ? { team } : {}),
      statuses: Object.freeze(statuses as NonNullable<(typeof statuses)[number]>[]), launches });
  });
  return runs.some((run) => run === null) ? null : Object.freeze(runs as RemoteRunSummary[]);
};

/** A Team run's members as a peer sends them: its coordinator's address among its members; `null` otherwise. */
export const remoteRunMembersOf = (value: unknown): RemoteRunMembers | null => {
  const team = record(value);
  if (!team || !nonEmpty(team.coordinatorAddress) || !Array.isArray(team.members)) return null;
  const members = team.members.map((entry: unknown) => {
    const member = record(entry);
    return member && nonEmpty(member.address) && nonEmpty(member.agentRunId) ? Object.freeze({ address: member.address, agentRunId: member.agentRunId }) : null;
  });
  if (members.some((member) => member === null) || !members.some((member) => member!.address === team.coordinatorAddress)) return null;
  return Object.freeze({ coordinatorAddress: team.coordinatorAddress, members: Object.freeze(members as NonNullable<(typeof members)[number]>[]) });
};

/** A peer's agent projection, read strictly: the run-view projection payload (its entries are the window's). */
export const remoteAgentProjectionOf = (value: unknown): RemoteAgentProjection | null => {
  const projection = record(value);
  if (!projection || !nonEmpty(projection.agentRunId) || !Array.isArray(projection.conversation) || !Array.isArray(projection.activities)) return null;
  if (typeof projection.hasEarlierActiveTraceEvents !== "boolean") return null;
  const optionalText = (field: unknown) => typeof field === "string" ? field : null;
  return Object.freeze({
    agentRunId: projection.agentRunId,
    conversation: Object.freeze([...projection.conversation]),
    activities: Object.freeze([...projection.activities]),
    summary: optionalText(projection.summary),
    lastActivityAt: optionalText(projection.lastActivityAt),
    hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
  });
};

/** One observation frame, read strictly: an agent run ID and a presentation message; anything else is `null`. */
export const remoteObservationFrameOf = (value: unknown): Readonly<{ agentRunId: string; message: AgentPresentationMessage }> | null => {
  const frame = record(value);
  if (!frame || !nonEmpty(frame.agentRunId)) return null;
  const message = agentPresentationMessageSchema.safeParse(frame.message);
  return message.success ? Object.freeze({ agentRunId: frame.agentRunId, message: message.data }) : null;
};
