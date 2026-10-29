import { agentPresentationMessageSchema, remoteAgentStatusSchema, type AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { RemoteAgentProjection, RemoteRunSummary } from "../../agent-collaboration/execution/remote/remote-run-channel.js";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/**
 * A peer's run summaries, read strictly (autobyteus-278): each run is an Agent or a Team run by ID, with a title or
 * `null` and statuses of known values. Anything else makes the whole answer malformed (`null`).
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
      return status && nonEmpty(status.agentRunId) && parsed.success ? Object.freeze({ agentRunId: status.agentRunId, status: parsed.data }) : null;
    });
    if (statuses.some((status) => status === null)) return null;
    return Object.freeze({ kind: run.kind, runId: run.runId, title: run.title as string | null,
      statuses: Object.freeze(statuses as NonNullable<(typeof statuses)[number]>[]) });
  });
  return runs.some((run) => run === null) ? null : Object.freeze(runs as RemoteRunSummary[]);
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
