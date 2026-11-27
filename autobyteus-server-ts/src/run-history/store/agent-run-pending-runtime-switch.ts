import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata, PendingRuntimeSwitch, RuntimeSwitchCause } from "./agent-run-metadata-types.js";
import { nullableString, objectRecord, requiredString, requireKeys } from "./run-execution-tree-shared-record-schemas.js";

/**
 * The `pendingRuntimeSwitch` section of a standalone run's metadata, read with the exact keys and written back exactly.
 * A malformed section makes the run's file unreadable, so the run is left out with a warning and its file is never
 * rewritten (DESIGN.md rule 7), like `delegatedFrom`.
 */
export const parsePendingRuntimeSwitch = (value: unknown, label = "pendingRuntimeSwitch"): PendingRuntimeSwitch => {
  const section = objectRecord(value, label);
  requireKeys(section, ["switchId", "from"], label);
  const from = objectRecord(section.from, `${label}.from`);
  requireKeys(from, ["runtimeKind", "llmModelIdentifier", "llmConfig", "platformAgentRunId"], `${label}.from`);
  const runtimeKind = requiredString(from.runtimeKind, `${label}.from.runtimeKind`);
  if (!Object.values(RuntimeKind).includes(runtimeKind as RuntimeKind)) {
    throw new Error(`${label}.from.runtimeKind must be an agent runtime kind.`);
  }
  const llmConfig = from.llmConfig === null ? null : objectRecord(from.llmConfig, `${label}.from.llmConfig`);
  const cause = section.cause === undefined ? null : parseRuntimeSwitchCause(section.cause, `${label}.cause`);
  return {
    switchId: requiredString(section.switchId, `${label}.switchId`),
    from: {
      runtimeKind: runtimeKind as RuntimeKind,
      llmModelIdentifier: requiredString(from.llmModelIdentifier, `${label}.from.llmModelIdentifier`),
      llmConfig,
      platformAgentRunId: nullableString(from.platformAgentRunId, `${label}.from.platformAgentRunId`),
    },
    ...(cause ? { cause } : {}),
  };
};

/** An automatic switch's cause (autobyteus-646 R-7), read with its exact fields; a malformed one makes the file unreadable. */
const parseRuntimeSwitchCause = (value: unknown, label: string): RuntimeSwitchCause => {
  const cause = objectRecord(value, label);
  requireKeys(cause, ["kind", "resetAt", "chosenBy", "reason"], label);
  if (cause.kind !== "usage_limit") throw new Error(`${label}.kind must be usage_limit.`);
  if (cause.chosenBy !== "model_router" && cause.chosenBy !== "history") throw new Error(`${label}.chosenBy must be model_router or history.`);
  return { kind: "usage_limit", resetAt: nullableString(cause.resetAt, `${label}.resetAt`), chosenBy: cause.chosenBy,
    reason: nullableString(cause.reason, `${label}.reason`) };
};

/**
 * Which agent runtime wrote the run's open raw-trace file: the previous runtime while a switch is pending (the metadata
 * already holds the new runtime; the open file still holds the previous runtime's records), otherwise the run's own.
 * The one owner of this fact; the Work Journal's target for a standalone run uses it.
 */
export const openRawTraceRuntimeKind = (metadata: Pick<AgentRunMetadata, "runtimeKind" | "pendingRuntimeSwitch">): RuntimeKind =>
  metadata.pendingRuntimeSwitch?.from.runtimeKind ?? metadata.runtimeKind;
