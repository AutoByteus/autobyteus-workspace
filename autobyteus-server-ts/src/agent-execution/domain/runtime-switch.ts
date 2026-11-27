import { createHash } from "node:crypto";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata, PendingRuntimeSwitch, RuntimeSwitchCause } from "../../run-history/store/agent-run-metadata-types.js";

/** The agent runtime and model on one side of a switch. */
export type RuntimeSwitchSide = Readonly<{ runtimeKind: RuntimeKind; llmModelIdentifier: string }>;

/**
 * An agent runtime switch as the memory port and the notice port need it: the key that makes it idempotent, the
 * sides, and the marker sentence the chat and the journal show. Built once, by `buildRuntimeSwitchBetween` (the user changed
 * the agent runtime or model) or `buildSessionRenewal` (the runtime lost the saved session, autobyteus-599). Both take the
 * same steps and stored records (boundary `runtime_switch`); the builder sets the key prefix and the marker sentence.
 */
export type RuntimeSwitch = Readonly<{
  key: string;
  /** The ID of the marker record: derived from the key, so every attempt writes and finds the same one. */
  markerTraceId: string;
  runId: string;
  from: RuntimeSwitchSide;
  to: RuntimeSwitchSide;
  markerText: string;
}>;

const label = (side: RuntimeSwitchSide): string => `${agentRuntimeName(side.runtimeKind)} (${side.llmModelIdentifier})`;

/** The one function that derives the marker's ID from the switch key. */
export const runtimeSwitchMarkerTraceId = (key: string): string =>
  `rt_runtime_switch_${createHash("sha256").update(key).digest("hex").slice(0, 24)}`;

/**
 * The switch a pending switch stands for, for any record that holds a binding (a standalone run, a Team or Org member, a
 * delegated copy): `to` is the record's current selection, the pending switch holds the previous one. The key holds the
 * switch's own identity, so a retry of the same activation finds the marker it wrote.
 */
export const buildRuntimeSwitchBetween = (input: {
  runId: string;
  to: RuntimeSwitchSide;
  pending: PendingRuntimeSwitch;
}): RuntimeSwitch => {
  const from: RuntimeSwitchSide = { runtimeKind: input.pending.from.runtimeKind, llmModelIdentifier: input.pending.from.llmModelIdentifier };
  const to: RuntimeSwitchSide = { runtimeKind: input.to.runtimeKind, llmModelIdentifier: input.to.llmModelIdentifier };
  const key = `runtime_switch:${input.runId}:${input.pending.switchId}`;
  // DEC-008, N-4: a model hand-over (both sides the same agent runtime) names the model it changed, but only when the
  // model actually differs — a stored same-runtime, same-model pending switch (P-002) keeps today's text.
  const modelHandOver = from.runtimeKind === to.runtimeKind && from.llmModelIdentifier !== to.llmModelIdentifier;
  return Object.freeze({
    key,
    markerTraceId: runtimeSwitchMarkerTraceId(key),
    runId: input.runId,
    from,
    to,
    markerText: input.pending.cause ? causeMarkerText(input.pending.cause, from, to)
      : modelHandOver
        ? `Model changed from ${from.llmModelIdentifier} to ${to.llmModelIdentifier}.`
        : `Agent runtime changed from ${label(from)} to ${label(to)}.`,
  });
};

/** "Nov 27, 09:00 UTC" for an ISO time; the text itself when it is not one. */
export const resetTimeText = (iso: string): string => {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso;
  const date = new Date(time);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${date.getUTCDate()}, ${date.toISOString().slice(11, 16)} UTC`;
};

/**
 * An automatic switch's marker (autobyteus-646 R-7), rendered from its stored facts: "Codex usage limit reached (resets
 * Nov 27, 09:00 UTC) — switched to Claude (opus). Chosen by the Model Router: <reason>." (or "Chosen from this agent's
 * history.", or "Chosen by the node." for R-17's node fallback).
 */
const causeMarkerText = (cause: RuntimeSwitchCause, from: RuntimeSwitchSide, to: RuntimeSwitchSide): string => {
  const reset = cause.resetAt ? ` (resets ${resetTimeText(cause.resetAt)})` : "";
  const chosen = cause.chosenBy === "model_router"
    ? `Chosen by the Model Router${cause.reason ? `: ${cause.reason.trim().replace(/\.+$/, "")}` : ""}.`
    : cause.chosenBy === "node_fallback" ? "Chosen by the node." : "Chosen from this agent's history.";
  return `${agentRuntimeName(from.runtimeKind)} usage limit reached${reset} — switched to ${label(to)}. ${chosen}`;
};

/**
 * The session renewal of a run whose runtime lost its saved session (autobyteus-599): a fresh session of the same runtime
 * and model (`from` = `to`). The key holds the lost session's ID, so a retry after a failure part-way finds the marker and
 * the segment it wrote, and a later loss of the renewed session is a renewal of its own.
 */
export const buildSessionRenewal = (input: {
  runId: string;
  side: RuntimeSwitchSide;
  lostPlatformAgentRunId: string;
}): RuntimeSwitch => {
  const side: RuntimeSwitchSide = { runtimeKind: input.side.runtimeKind, llmModelIdentifier: input.side.llmModelIdentifier };
  const key = `session_renewal:${input.runId}:${input.lostPlatformAgentRunId}`;
  return Object.freeze({
    key,
    markerTraceId: runtimeSwitchMarkerTraceId(key),
    runId: input.runId,
    from: side,
    to: side,
    markerText: `The saved ${agentRuntimeName(side.runtimeKind)} session of this run was no longer available, so a new session continues from the work journal.`,
  });
};

/** The switch a standalone run's pending switch stands for, or null when none is pending. */
export const buildRuntimeSwitch = (metadata: AgentRunMetadata): RuntimeSwitch | null =>
  metadata.pendingRuntimeSwitch
    ? buildRuntimeSwitchBetween({
        runId: metadata.runId,
        to: { runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier },
        pending: metadata.pendingRuntimeSwitch,
      })
    : null;
