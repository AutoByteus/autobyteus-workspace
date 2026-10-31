import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/** The agent runtime and model on one side of a switch. */
export type RuntimeSwitchSide = Readonly<{ runtimeKind: RuntimeKind; llmModelIdentifier: string }>;

/**
 * An agent runtime switch as the memory port and the notice port need it: the key that makes it idempotent, the
 * sides, and the marker sentence the chat and the journal show. Built once, by `buildRuntimeSwitch`.
 */
export type RuntimeSwitch = Readonly<{
  key: string;
  runId: string;
  from: RuntimeSwitchSide;
  to: RuntimeSwitchSide;
  markerText: string;
}>;

const label = (side: RuntimeSwitchSide): string => `${agentRuntimeName(side.runtimeKind)} (${side.llmModelIdentifier})`;

/**
 * The switch a run's pending switch stands for, or null when none is pending. The key is the stored time of the first
 * pending save, so a retry of the same activation finds the marker it wrote.
 */
export const buildRuntimeSwitch = (metadata: AgentRunMetadata): RuntimeSwitch | null => {
  const pending = metadata.pendingRuntimeSwitch;
  if (!pending) return null;
  const from: RuntimeSwitchSide = { runtimeKind: pending.from.runtimeKind, llmModelIdentifier: pending.from.llmModelIdentifier };
  const to: RuntimeSwitchSide = { runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier };
  return Object.freeze({
    key: `runtime_switch:${metadata.runId}:${pending.requestedAt}`,
    runId: metadata.runId,
    from,
    to,
    markerText: `Agent runtime changed from ${label(from)} to ${label(to)}.`,
  });
};
