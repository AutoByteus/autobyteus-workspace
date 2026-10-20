import path from "node:path";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  TaskAgentCoordinatingRun,
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

/** Whether a parsed run file carries the `taskAgent` section that makes it a task agent's own file (G1, G2). */
export const hasTaskAgentSection = (value: unknown): boolean =>
  !!value && typeof value === "object" && !Array.isArray(value) && "taskAgent" in value;

/** A coordinating run `{kind, runId}` (a task agent's, or a remote run's back-link on its own node). */
export const parseTaskAgentCoordinatingRun = (value: unknown, label: string): TaskAgentCoordinatingRun => {
  const coordinating = objectRecord(value, label);
  requireKeys(coordinating, ["kind", "runId"], label);
  if (!COORDINATING_RUN_KINDS.includes(coordinating.kind as TaskAgentCoordinatingRun["kind"])) {
    throw new Error(`${label}.kind is unsupported.`);
  }
  return { kind: coordinating.kind as TaskAgentCoordinatingRun["kind"], runId: requiredString(coordinating.runId, `${label}.runId`) };
};

export const parseTaskAgentSection = (value: unknown, label = "taskAgent"): TaskAgentSection => {
  const section = objectRecord(value, label);
  requireKeys(section, ["coordinatingRun", "address"], label);
  return {
    coordinatingRun: parseTaskAgentCoordinatingRun(section.coordinatingRun, `${label}.coordinatingRun`),
    ...(section.delegatorAgentRunId === undefined
      ? {}
      : { delegatorAgentRunId: requiredString(section.delegatorAgentRunId, `${label}.delegatorAgentRunId`) }),
    address: canonicalNonRootAddress(section.address, `${label}.address`),
    ...(section.launchSource === undefined
      ? {}
      : { launchSource: parseLaunchConfigurationSource(section.launchSource, `${label}.launchSource`) }),
    ...parseOptionalUserLaunchSelection(section, "userLaunchSelection", label),
  };
};

/** The launch a task agent started with (contract §3.1). */
export const taskAgentStartedLaunch = (metadata: TaskAgentRunMetadata): AgentLaunchConfiguration => ({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig,
  autoExecuteTools: metadata.autoExecuteTools,
  workspaceRootPath: metadata.workspaceRootPath,
});

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
  const launch = parseLaunchConfiguration({
    runtimeKind: record.runtimeKind,
    llmModelIdentifier: record.llmModelIdentifier,
    llmConfig: record.llmConfig,
    autoExecuteTools: record.autoExecuteTools,
    workspaceRootPath: record.workspaceRootPath,
  }, label);
  return {
    runId,
    agentDefinitionId: requiredString(record.agentDefinitionId, `${label}.agentDefinitionId`),
    workspaceRootPath: launch.workspaceRootPath,
    memoryDir: path.resolve(requiredString(record.memoryDir, `${label}.memoryDir`)),
    llmModelIdentifier: launch.llmModelIdentifier,
    llmConfig: launch.llmConfig,
    autoExecuteTools: launch.autoExecuteTools,
    runtimeKind: launch.runtimeKind,
    platformAgentRunId: nullableString(record.platformAgentRunId, `${label}.platformAgentRunId`),
    startedAt: isoTimestamp(record.startedAt, `${label}.startedAt`),
    taskAgent,
  };
};
