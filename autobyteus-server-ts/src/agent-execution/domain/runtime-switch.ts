import { createHash } from "node:crypto";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata, PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";

/** The agent runtime and model on one side of a switch. */
export type RuntimeSwitchSide = Readonly<{ runtimeKind: RuntimeKind; llmModelIdentifier: string }>;

/**
 * An agent runtime switch as the memory port and the notice port need it: the key that makes it idempotent, the
 * sides, and the marker sentence the chat and the journal show. Built once, by `buildRuntimeSwitch`.
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
  return Object.freeze({
    key,
    markerTraceId: runtimeSwitchMarkerTraceId(key),
    runId: input.runId,
    from,
    to,
    markerText: `Agent runtime changed from ${label(from)} to ${label(to)}.`,
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
