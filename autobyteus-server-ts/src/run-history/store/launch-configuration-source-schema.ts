import type { PendingRuntimeSwitch } from "./agent-run-metadata-types.js";
import { parsePendingRuntimeSwitch } from "./agent-run-pending-runtime-switch.js";
import {
  LAUNCH_CONFIGURATION_FALLBACK_REASONS,
  LAUNCH_CONFIGURATION_ORIGINS,
  SKIPPABLE_LAUNCH_LAYERS,
  type LaunchConfigurationFallback,
  type LaunchConfigurationSource,
} from "../../agent-collaboration/domain/launch-configuration-source.js";
import { nullableString, objectRecord, requireKeys, requiredArray, requiredString } from "./run-execution-tree-shared-record-schemas.js";

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], label: string): T => {
  if (!allowed.includes(value as T)) throw new Error(`${label} must be one of ${allowed.join(", ")}.`);
  return value as T;
};

/**
 * A recorded launch source. Records written before autobyteus-32 use a subset of the origins, layers and reasons, so
 * they read as they always did; a `model_router` origin requires the router's `choiceReason` and `taskKind`.
 */
export const parseLaunchConfigurationSource = (value: unknown, label: string): LaunchConfigurationSource => {
  const source = objectRecord(value, label);
  requireKeys(source, ["origin", "fallbacks"], label);
  const origin = oneOf(source.origin, LAUNCH_CONFIGURATION_ORIGINS, `${label}.origin`);
  const fallbacks = requiredArray(source.fallbacks, `${label}.fallbacks`).map((item, index): LaunchConfigurationFallback => {
      const at = `${label}.fallbacks[${index}]`;
      const fallback = objectRecord(item, at);
      requireKeys(fallback, ["layer", "runtimeKind", "llmModelIdentifier", "reason", "detail"], at);
      return {
        layer: oneOf(fallback.layer, SKIPPABLE_LAUNCH_LAYERS, `${at}.layer`),
        runtimeKind: nullableString(fallback.runtimeKind, `${at}.runtimeKind`),
        llmModelIdentifier: nullableString(fallback.llmModelIdentifier, `${at}.llmModelIdentifier`),
        reason: oneOf(fallback.reason, LAUNCH_CONFIGURATION_FALLBACK_REASONS, `${at}.reason`),
        detail: requiredString(fallback.detail, `${at}.detail`),
      };
    });
  if (origin !== "model_router") return { origin, fallbacks };
  requireKeys(source, ["choiceReason", "taskKind"], label);
  return {
    origin,
    fallbacks,
    choiceReason: requiredString(source.choiceReason, `${label}.choiceReason`),
    taskKind: requiredString(source.taskKind, `${label}.taskKind`),
  };
};

/**
 * The optional launch source of a copy record (`launchSource` of an agent or a Team member,
 * `defaultLaunchSource` of a Team): absent truthfully means "source not recorded"; present values are
 * validated and projected exactly.
 */
export const parseOptionalLaunchFields = (
  record: Record<string, unknown>,
  keys: Readonly<{ source: "launchSource" | "defaultLaunchSource" }>,
  label: string,
): { launchSource?: LaunchConfigurationSource; defaultLaunchSource?: LaunchConfigurationSource } => (
  record[keys.source] !== undefined
    ? { [keys.source]: parseLaunchConfigurationSource(record[keys.source], `${label}.${keys.source}`) }
    : {}
);

/**
 * The optional pending agent runtime switch of a member or copy record (autobyteus-348). Absent truthfully means none (every
 * record written before it existed); a malformed section makes the record's file unreadable, like a standalone run's.
 */
export const parseOptionalPendingRuntimeSwitch = (
  record: Record<string, unknown>,
  label: string,
): { pendingRuntimeSwitch?: PendingRuntimeSwitch } =>
  record.pendingRuntimeSwitch === undefined
    ? {}
    : { pendingRuntimeSwitch: parsePendingRuntimeSwitch(record.pendingRuntimeSwitch, `${label}.pendingRuntimeSwitch`) };
