import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata, PendingRuntimeSwitch } from "./agent-run-metadata-types.js";
import { isoTimestamp, nullableString, objectRecord, requiredString, requireKeys } from "./run-execution-tree-shared-record-schemas.js";

/**
 * The `pendingRuntimeSwitch` section of a standalone run's metadata, read with the exact keys and written back exactly.
 * A malformed section makes the run's file unreadable, so the run is left out with a warning and its file is never
 * rewritten (DESIGN.md rule 7), like `delegatedFrom`.
 */
export const parsePendingRuntimeSwitch = (value: unknown, label = "pendingRuntimeSwitch"): PendingRuntimeSwitch => {
  const section = objectRecord(value, label);
  requireKeys(section, ["requestedAt", "from"], label);
  const from = objectRecord(section.from, `${label}.from`);
  requireKeys(from, ["runtimeKind", "llmModelIdentifier", "llmConfig", "platformAgentRunId"], `${label}.from`);
  const runtimeKind = requiredString(from.runtimeKind, `${label}.from.runtimeKind`);
  if (!Object.values(RuntimeKind).includes(runtimeKind as RuntimeKind)) {
    throw new Error(`${label}.from.runtimeKind must be an agent runtime kind.`);
  }
  const llmConfig = from.llmConfig === null ? null : objectRecord(from.llmConfig, `${label}.from.llmConfig`);
  return {
    requestedAt: isoTimestamp(section.requestedAt, `${label}.requestedAt`),
    from: {
      runtimeKind: runtimeKind as RuntimeKind,
      llmModelIdentifier: requiredString(from.llmModelIdentifier, `${label}.from.llmModelIdentifier`),
      llmConfig,
      platformAgentRunId: nullableString(from.platformAgentRunId, `${label}.from.platformAgentRunId`),
    },
  };
};

/**
 * Which agent runtime wrote the run's open raw-trace file: the previous runtime while a switch is pending (the metadata
 * already holds the new runtime; the open file still holds the previous runtime's records), otherwise the run's own.
 * The one owner of this fact; the Work Journal's target for a standalone run uses it.
 */
export const openRawTraceRuntimeKind = (metadata: Pick<AgentRunMetadata, "runtimeKind" | "pendingRuntimeSwitch">): RuntimeKind =>
  metadata.pendingRuntimeSwitch?.from.runtimeKind ?? metadata.runtimeKind;
