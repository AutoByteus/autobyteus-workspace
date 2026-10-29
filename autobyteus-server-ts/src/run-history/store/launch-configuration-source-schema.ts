import type { UserLaunchSelection } from "../domain/run-execution-tree-shared-records.js";
import {
  LAUNCH_CONFIGURATION_FALLBACK_REASONS,
  LAUNCH_CONFIGURATION_ORIGINS,
  SKIPPABLE_LAUNCH_LAYERS,
  type LaunchConfigurationFallback,
  type LaunchConfigurationSource,
} from "../../agent-collaboration/domain/launch-configuration-source.js";
import {
  isoTimestamp,
  nullableString,
  objectRecord,
  requireKeys,
  requiredArray,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";

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
 * The optional user model choice of a copy record (`userLaunchSelection` on
 * agent-level records, `userTeamLaunchSelection` on team-level records). Absent truthfully means
 * no user choice (every record written before selections existed); present values are validated
 * and projected exactly.
 */
export const parseOptionalUserLaunchSelection = <TKey extends "userLaunchSelection" | "userTeamLaunchSelection">(
  record: Record<string, unknown>,
  key: TKey,
  label: string,
): { [K in TKey]?: UserLaunchSelection } => {
  if (record[key] === undefined) return {};
  const at = `${label}.${key}`;
  const selection = objectRecord(record[key], at);
  requireKeys(selection, ["llmModelIdentifier", "llmConfig", "selectedAt"], at);
  if (
    selection.llmConfig !== null
    && (!selection.llmConfig || typeof selection.llmConfig !== "object" || Array.isArray(selection.llmConfig))
  ) throw new Error(`${at}.llmConfig must be an object or null.`);
  return {
    [key]: {
      llmModelIdentifier: requiredString(selection.llmModelIdentifier, `${at}.llmModelIdentifier`),
      llmConfig: selection.llmConfig === null ? null : structuredClone(selection.llmConfig as Record<string, unknown>),
      selectedAt: isoTimestamp(selection.selectedAt, `${at}.selectedAt`),
    },
  } as { [K in TKey]?: UserLaunchSelection };
};
