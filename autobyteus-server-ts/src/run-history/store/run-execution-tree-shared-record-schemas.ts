import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskExecution,
  TaskTeamMemberExecution,
  TeamRunApplicationBinding,
} from "../domain/run-execution-tree-shared-records.js";

export const exactRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

export const assertExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};

export const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

export const nullableString = (value: unknown, label: string): string | null =>
  value === null ? null : requiredString(value, label);

export const isoTimestamp = (value: unknown, label: string): string => {
  const normalized = requiredString(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized)
    || Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};

export const canonicalNonRootAddress = (value: unknown, label: string): AgentTeamAddress => {
  const address = assertAgentTeamAddress(requiredString(value, label));
  if (address === "/") throw new Error(`${label} must be a non-root address.`);
  return address;
};

export const requiredArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
};

export const validateLaunchConfiguration = (value: unknown, label: string): void => {
  const launch = exactRecord(value, label);
  assertExactKeys(launch, [
    "runtimeKind",
    "llmModelIdentifier",
    "llmConfig",
    "autoExecuteTools",
    "skillAccessMode",
    "workspaceRootPath",
  ], label);
  if (!["autobyteus", "claude_agent_sdk", "codex_app_server"].includes(String(launch.runtimeKind))) {
    throw new Error(`${label}.runtimeKind is unsupported.`);
  }
  requiredString(launch.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (
    launch.llmConfig !== null
    && (!launch.llmConfig || typeof launch.llmConfig !== "object" || Array.isArray(launch.llmConfig))
  ) throw new Error(`${label}.llmConfig must be an object or null.`);
  if (typeof launch.autoExecuteTools !== "boolean") throw new Error(`${label}.autoExecuteTools must be boolean.`);
  if (!Object.values(SkillAccessMode).includes(launch.skillAccessMode as SkillAccessMode)) {
    throw new Error(`${label}.skillAccessMode is unsupported.`);
  }
  if (launch.workspaceRootPath !== null) requiredString(launch.workspaceRootPath, `${label}.workspaceRootPath`);
};

export const validateConfiguredAgent = (value: unknown, label: string): ConfiguredAgentExecutionNode => {
  const member = exactRecord(value, label);
  assertExactKeys(member, [
    "address",
    "agentDefinitionId",
    "role",
    "description",
    "agentRunId",
    "platformAgentRunId",
    "launchConfiguration",
  ], label);
  canonicalNonRootAddress(member.address, `${label}.address`);
  requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`);
  nullableString(member.role, `${label}.role`);
  nullableString(member.description, `${label}.description`);
  requiredString(member.agentRunId, `${label}.agentRunId`);
  nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`);
  validateLaunchConfiguration(member.launchConfiguration, `${label}.launchConfiguration`);
  return member as unknown as ConfiguredAgentExecutionNode;
};

export const validateConfiguredTeam = (value: unknown, label: string): ConfiguredTeamExecutionNode => {
  const team = exactRecord(value, label);
  assertExactKeys(team, [
    "address",
    "teamDefinitionId",
    "role",
    "description",
    "teamRunId",
    "coordinatorAddress",
    "defaultLaunchConfiguration",
    "members",
    "taskExecutions",
  ], label);
  const teamAddress = canonicalNonRootAddress(team.address, `${label}.address`);
  requiredString(team.teamDefinitionId, `${label}.teamDefinitionId`);
  nullableString(team.role, `${label}.role`);
  nullableString(team.description, `${label}.description`);
  requiredString(team.teamRunId, `${label}.teamRunId`);
  const coordinatorAddress = canonicalNonRootAddress(team.coordinatorAddress, `${label}.coordinatorAddress`);
  validateLaunchConfiguration(team.defaultLaunchConfiguration, `${label}.defaultLaunchConfiguration`);
  const members = requiredArray(team.members, `${label}.members`).map((member, index) =>
    validateConfiguredAgent(member, `${label}.members[${index}]`));
  for (const member of members) {
    if (getParentAgentTeamAddress(member.address) !== teamAddress) {
      throw new Error(`Configured placement '${member.address}' is not a direct Agent child of '${teamAddress}'.`);
    }
  }
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error(`Configured Team '${teamAddress}' has no unique direct coordinator Agent.`);
  }
  requiredArray(team.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
    validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
  return team as unknown as ConfiguredTeamExecutionNode;
};

const validateTaskTeamMember = (value: unknown, label: string): TaskTeamMemberExecution => {
  const member = exactRecord(value, label);
  if ("agentRunId" in member) {
    assertExactKeys(member, ["address", "agentRunId", "platformAgentRunId"], label);
    canonicalNonRootAddress(member.address, `${label}.address`);
    requiredString(member.agentRunId, `${label}.agentRunId`);
    nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`);
  } else {
    assertExactKeys(member, ["address", "teamRunId", "members", "taskExecutions"], label);
    canonicalNonRootAddress(member.address, `${label}.address`);
    requiredString(member.teamRunId, `${label}.teamRunId`);
    requiredArray(member.members, `${label}.members`).forEach((child, index) =>
      validateTaskTeamMember(child, `${label}.members[${index}]`));
    requiredArray(member.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
      validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
  }
  return member as unknown as TaskTeamMemberExecution;
};

export const validateTaskExecution = (value: unknown, label: string): TaskExecution => {
  const execution = exactRecord(value, label);
  if ("agentRunId" in execution) {
    assertExactKeys(execution, [
      "address",
      "agentRunId",
      "platformAgentRunId",
      "startedAt",
      "settledAt",
    ], label);
    canonicalNonRootAddress(execution.address, `${label}.address`);
    requiredString(execution.agentRunId, `${label}.agentRunId`);
    nullableString(execution.platformAgentRunId, `${label}.platformAgentRunId`);
  } else {
    assertExactKeys(execution, [
      "address",
      "teamRunId",
      "members",
      "taskExecutions",
      "startedAt",
      "settledAt",
    ], label);
    canonicalNonRootAddress(execution.address, `${label}.address`);
    requiredString(execution.teamRunId, `${label}.teamRunId`);
    requiredArray(execution.members, `${label}.members`).forEach((member, index) =>
      validateTaskTeamMember(member, `${label}.members[${index}]`));
    requiredArray(execution.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
      validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
  }
  const startedAt = isoTimestamp(execution.startedAt, `${label}.startedAt`);
  if (execution.settledAt !== null) {
    const settledAt = isoTimestamp(execution.settledAt, `${label}.settledAt`);
    if (settledAt < startedAt) throw new Error(`${label}.settledAt precedes startedAt.`);
  }
  return execution as unknown as TaskExecution;
};

export const validateApplicationBinding = (value: unknown): TeamRunApplicationBinding | null => {
  if (value === null) return null;
  const binding = exactRecord(value, "applicationBinding");
  assertExactKeys(binding, ["applicationId", "bindingId"], "applicationBinding");
  requiredString(binding.applicationId, "applicationBinding.applicationId");
  requiredString(binding.bindingId, "applicationBinding.bindingId");
  return binding as unknown as TeamRunApplicationBinding;
};

export const validateConfiguredPlacementUniqueness = (
  members: readonly ConfiguredExecutionNode[],
): void => {
  const addresses = new Set<string>();
  const agentRuns = new Set<string>();
  const teamRuns = new Set<string>();
  for (const member of members) {
    if (addresses.has(member.address)) throw new Error(`Duplicate configured address '${member.address}'.`);
    addresses.add(member.address);
    if ("agentRunId" in member) {
      if (agentRuns.has(member.agentRunId)) throw new Error(`Duplicate AgentRun ID '${member.agentRunId}'.`);
      agentRuns.add(member.agentRunId);
      continue;
    }
    if (teamRuns.has(member.teamRunId)) throw new Error(`Duplicate TeamRun ID '${member.teamRunId}'.`);
    teamRuns.add(member.teamRunId);
    for (const agent of member.members) {
      if (addresses.has(agent.address)) throw new Error(`Duplicate configured address '${agent.address}'.`);
      addresses.add(agent.address);
      if (agentRuns.has(agent.agentRunId)) throw new Error(`Duplicate AgentRun ID '${agent.agentRunId}'.`);
      agentRuns.add(agent.agentRunId);
    }
  }
};

export const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};
