// Frozen verbatim copy (import paths remapped only) of `src/run-history/store/launch-configuration-source-schema.ts` as of the
// D-10 rename commit 8bbd081c8d (behavior identical to origin/personal@66429d6f31). Owned by
// released app-data migrations and `20261017_task_agent_own_run_v1`; current runtime must not import it.

import type { AgentLaunchConfiguration } from "../../../../agent-team-execution/domain/team-run-config.js";
import type { UserLaunchSelection } from "./run-execution-tree-shared-records.js";
import {
  CONFIGURED_LAUNCH_LAYERS,
  LAUNCH_CONFIGURATION_FALLBACK_REASONS,
  LAUNCH_CONFIGURATION_ORIGINS,
  type LaunchConfigurationSource,
} from "../../../../agent-collaboration/domain/launch-configuration-source.js";
import {
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredArray,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], label: string): T => {
  if (!allowed.includes(value as T)) throw new Error(`${label} must be one of ${allowed.join(", ")}.`);
  return value as T;
};

export const parseLaunchConfigurationSource = (value: unknown, label: string): LaunchConfigurationSource => {
  const source = objectRecord(value, label);
  requireKeys(source, ["origin", "fallbacks"], label);
  return {
    origin: oneOf(source.origin, LAUNCH_CONFIGURATION_ORIGINS, `${label}.origin`),
    fallbacks: requiredArray(source.fallbacks, `${label}.fallbacks`).map((item, index) => {
      const at = `${label}.fallbacks[${index}]`;
      const fallback = objectRecord(item, at);
      requireKeys(fallback, ["layer", "runtimeKind", "llmModelIdentifier", "reason", "detail"], at);
      return {
        layer: oneOf(fallback.layer, CONFIGURED_LAUNCH_LAYERS, `${at}.layer`),
        runtimeKind: nullableString(fallback.runtimeKind, `${at}.runtimeKind`),
        llmModelIdentifier: nullableString(fallback.llmModelIdentifier, `${at}.llmModelIdentifier`),
        reason: oneOf(fallback.reason, LAUNCH_CONFIGURATION_FALLBACK_REASONS, `${at}.reason`),
        detail: requiredString(fallback.detail, `${at}.detail`),
      };
    }),
  };
};

/**
 * Optional launch fields of catalog-copy records: absent keys truthfully mean
 * "runs on the Team's launch" (member `launchConfiguration`) or "source not recorded"; present
 * values are validated and projected exactly.
 */
export const parseOptionalLaunchFields = (
  record: Record<string, unknown>,
  keys: Readonly<{ launch?: "launchConfiguration"; source: "launchSource" | "defaultLaunchSource" }>,
  label: string,
): { launchConfiguration?: AgentLaunchConfiguration; launchSource?: LaunchConfigurationSource; defaultLaunchSource?: LaunchConfigurationSource } => ({
  ...(keys.launch && record[keys.launch] !== undefined
    ? { launchConfiguration: parseLaunchConfiguration(record[keys.launch], `${label}.${keys.launch}`) }
    : {}),
  ...(record[keys.source] !== undefined
    ? { [keys.source]: parseLaunchConfigurationSource(record[keys.source], `${label}.${keys.source}`) }
    : {}),
});

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
