import path from "node:path";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  TaskAgentCoordinatingRun,
  TaskAgentOrigin,
  TaskAgentRunMetadata,
  TaskAgentSection,
} from "./agent-run-metadata-types.js";
import {
  canonicalNonRootAddress,
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";
import { parseLaunchConfigurationSource, parseOptionalUserLaunchSelection } from "./launch-configuration-source-schema.js";

/**
 * Own files of task agents (contract §3.1, §3.2) are read tolerantly and written exactly, like every
 * run file: known fields are required and validated, unknown fields are ignored, no version field.
 */

const COORDINATING_RUN_KINDS: readonly TaskAgentCoordinatingRun["kind"][] = ["agent", "agent_team", "agent_org"];
const ORIGINS: readonly TaskAgentOrigin[] = ["catalog", "configured_place"];

/** Whether a parsed run file carries the `taskAgent` section that makes it a task agent's own file (G1, G2). */
export const hasTaskAgentSection = (value: unknown): boolean =>
  !!value && typeof value === "object" && !Array.isArray(value) && "taskAgent" in value;

export const parseTaskAgentSection = (value: unknown, label = "taskAgent"): TaskAgentSection => {
  const section = objectRecord(value, label);
  requireKeys(section, ["coordinatingRun", "address", "origin"], label);
  const coordinating = objectRecord(section.coordinatingRun, `${label}.coordinatingRun`);
  requireKeys(coordinating, ["kind", "runId"], `${label}.coordinatingRun`);
  if (!COORDINATING_RUN_KINDS.includes(coordinating.kind as TaskAgentCoordinatingRun["kind"])) {
    throw new Error(`${label}.coordinatingRun.kind is unsupported.`);
  }
  if (!ORIGINS.includes(section.origin as TaskAgentOrigin)) throw new Error(`${label}.origin is unsupported.`);
  return {
    coordinatingRun: {
      kind: coordinating.kind as TaskAgentCoordinatingRun["kind"],
      runId: requiredString(coordinating.runId, `${label}.coordinatingRun.runId`),
    },
    ...(section.delegatorAgentRunId === undefined
      ? {}
      : { delegatorAgentRunId: requiredString(section.delegatorAgentRunId, `${label}.delegatorAgentRunId`) }),
    address: canonicalNonRootAddress(section.address, `${label}.address`),
    origin: section.origin as TaskAgentOrigin,
    ...(section.launchSource === undefined
      ? {}
      : { launchSource: parseLaunchConfigurationSource(section.launchSource, `${label}.launchSource`) }),
    ...parseOptionalUserLaunchSelection(section, "userLaunchSelection", label),
  };
};

/** The launch a task agent started with, or `null` when never recorded (all launch fields `null`). */
export const taskAgentStartedLaunch = (metadata: TaskAgentRunMetadata): AgentLaunchConfiguration | null =>
  metadata.runtimeKind === null || metadata.llmModelIdentifier === null || metadata.autoExecuteTools === null
    ? null
    : {
        runtimeKind: metadata.runtimeKind,
        llmModelIdentifier: metadata.llmModelIdentifier,
        llmConfig: metadata.llmConfig,
        autoExecuteTools: metadata.autoExecuteTools,
        workspaceRootPath: metadata.workspaceRootPath,
      };

const parseStartedLaunch = (record: Record<string, unknown>, label: string): AgentLaunchConfiguration | null => {
  const unrecorded = record.runtimeKind === null && record.llmModelIdentifier === null
    && record.llmConfig === null && record.autoExecuteTools === null && record.workspaceRootPath === null;
  return unrecorded ? null : parseLaunchConfiguration({
    runtimeKind: record.runtimeKind,
    llmModelIdentifier: record.llmModelIdentifier,
    llmConfig: record.llmConfig,
    autoExecuteTools: record.autoExecuteTools,
    workspaceRootPath: record.workspaceRootPath,
  }, label);
};

/** A task agent's own `run_metadata.json`; `expectedRunId` is the folder's run id. */
export const parseTaskAgentRunMetadata = (value: unknown, expectedRunId: string): TaskAgentRunMetadata => {
  const label = "Task agent run metadata";
  const record = objectRecord(value, label);
  requireKeys(record, [
    "runId", "agentDefinitionId", "workspaceRootPath", "memoryDir", "llmModelIdentifier", "llmConfig",
    "autoExecuteTools", "runtimeKind", "platformAgentRunId", "startedAt", "taskAgent",
  ], label);
  const runId = requiredString(record.runId, `${label}.runId`);
  if (runId !== expectedRunId) throw new Error(`${label} runId '${runId}' does not match '${expectedRunId}'.`);
  const taskAgent = parseTaskAgentSection(record.taskAgent, `${label}.taskAgent`);
  const launch = parseStartedLaunch(record, label);
  if (!launch && taskAgent.origin === "catalog") {
    throw new Error(`${label} of a catalog task agent must record the launch it started with.`);
  }
  return {
    runId,
    agentDefinitionId: requiredString(record.agentDefinitionId, `${label}.agentDefinitionId`),
    workspaceRootPath: launch?.workspaceRootPath ?? null,
    memoryDir: path.resolve(requiredString(record.memoryDir, `${label}.memoryDir`)),
    llmModelIdentifier: launch?.llmModelIdentifier ?? null,
    llmConfig: launch?.llmConfig ?? null,
    autoExecuteTools: launch?.autoExecuteTools ?? null,
    runtimeKind: launch?.runtimeKind ?? null,
    platformAgentRunId: nullableString(record.platformAgentRunId, `${label}.platformAgentRunId`),
    startedAt: isoTimestamp(record.startedAt, `${label}.startedAt`),
    taskAgent,
  };
};
