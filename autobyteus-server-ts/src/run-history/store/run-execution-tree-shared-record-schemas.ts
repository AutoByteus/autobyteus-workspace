import { parseTaskLifetimeStamp } from "../../agent-collaboration/execution/task/task-execution-lifetime.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  CollaboratorEntry,
  CollaboratorTeamMember,
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskExecution,
  TaskTeamMemberExecution,
  TeamRunApplicationBinding,
} from "../domain/run-execution-tree-shared-records.js";
import { isCollaboratorTeamEntry } from "../domain/run-execution-tree-shared-records.js";
import { parseTaskAgentExecutionSource, parseTaskTeamExecutionSource } from "./task-execution-source-schema.js";

/**
 * Execution-tree files are read tolerantly and written exactly (REQ-018): each parser
 * requires its known fields, validates them, and returns a projection holding only those
 * fields. Unknown or obsolete fields are never carried into memory or into later writes.
 */
export const objectRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

export const requireKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
): void => {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}.`);
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

const LAUNCH_CONFIGURATION_KEYS = [
  "runtimeKind",
  "llmModelIdentifier",
  "llmConfig",
  "autoExecuteTools",
  "workspaceRootPath",
] as const;

export const parseLaunchConfiguration = (value: unknown, label: string): AgentLaunchConfiguration => {
  const launch = objectRecord(value, label);
  requireKeys(launch, LAUNCH_CONFIGURATION_KEYS, label);
  if (!Object.values(RuntimeKind).includes(launch.runtimeKind as RuntimeKind)) {
    throw new Error(`${label}.runtimeKind is unsupported.`);
  }
  requiredString(launch.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (
    launch.llmConfig !== null
    && (!launch.llmConfig || typeof launch.llmConfig !== "object" || Array.isArray(launch.llmConfig))
  ) throw new Error(`${label}.llmConfig must be an object or null.`);
  if (typeof launch.autoExecuteTools !== "boolean") throw new Error(`${label}.autoExecuteTools must be boolean.`);
  if (launch.workspaceRootPath !== null) requiredString(launch.workspaceRootPath, `${label}.workspaceRootPath`);
  return {
    runtimeKind: launch.runtimeKind,
    llmModelIdentifier: launch.llmModelIdentifier,
    llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig),
    autoExecuteTools: launch.autoExecuteTools,
    workspaceRootPath: launch.workspaceRootPath,
  } as AgentLaunchConfiguration;
};

export const parseConfiguredAgent = (value: unknown, label: string): ConfiguredAgentExecutionNode => {
  const member = objectRecord(value, label);
  requireKeys(member, [
    "address",
    "agentDefinitionId",
    "role",
    "description",
    "agentRunId",
    "platformAgentRunId",
    "launchConfiguration",
  ], label);
  return {
    address: canonicalNonRootAddress(member.address, `${label}.address`),
    agentDefinitionId: requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`),
    role: nullableString(member.role, `${label}.role`),
    description: nullableString(member.description, `${label}.description`),
    agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
    launchConfiguration: parseLaunchConfiguration(member.launchConfiguration, `${label}.launchConfiguration`),
  };
};

export const parseConfiguredTeam = (value: unknown, label: string): ConfiguredTeamExecutionNode => {
  const team = objectRecord(value, label);
  requireKeys(team, [
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
  const coordinatorAddress = canonicalNonRootAddress(team.coordinatorAddress, `${label}.coordinatorAddress`);
  const members = requiredArray(team.members, `${label}.members`).map((member, index) =>
    parseConfiguredAgent(member, `${label}.members[${index}]`));
  for (const member of members) {
    if (getParentAgentTeamAddress(member.address) !== teamAddress) {
      throw new Error(`Configured placement '${member.address}' is not a direct Agent child of '${teamAddress}'.`);
    }
  }
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error(`Configured Team '${teamAddress}' has no unique direct coordinator Agent.`);
  }
  return {
    address: teamAddress,
    teamDefinitionId: requiredString(team.teamDefinitionId, `${label}.teamDefinitionId`),
    role: nullableString(team.role, `${label}.role`),
    description: nullableString(team.description, `${label}.description`),
    teamRunId: requiredString(team.teamRunId, `${label}.teamRunId`),
    coordinatorAddress,
    defaultLaunchConfiguration: parseLaunchConfiguration(team.defaultLaunchConfiguration, `${label}.defaultLaunchConfiguration`),
    members,
    taskExecutions: parseTaskExecutions(team.taskExecutions, `${label}.taskExecutions`),
  };
};

const parseTaskTeamMember = (value: unknown, label: string): TaskTeamMemberExecution => {
  const member = objectRecord(value, label);
  if ("agentRunId" in member) {
    requireKeys(member, ["address", "agentRunId", "platformAgentRunId"], label);
    return {
      address: canonicalNonRootAddress(member.address, `${label}.address`),
      agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
      platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
    };
  }
  requireKeys(member, ["address", "teamRunId", "members", "taskExecutions"], label);
  return {
    address: canonicalNonRootAddress(member.address, `${label}.address`),
    teamRunId: requiredString(member.teamRunId, `${label}.teamRunId`),
    members: requiredArray(member.members, `${label}.members`).map((child, index) =>
      parseTaskTeamMember(child, `${label}.members[${index}]`)),
    taskExecutions: parseTaskExecutions(member.taskExecutions, `${label}.taskExecutions`),
  };
};

/** `delegatorAgentRunId` is optional: children recorded before it existed carry none. */
const parseDelegator = (execution: Record<string, unknown>, label: string): { delegatorAgentRunId?: string } =>
  execution.delegatorAgentRunId === undefined
    ? {}
    : { delegatorAgentRunId: requiredString(execution.delegatorAgentRunId, `${label}.delegatorAgentRunId`) };

export const parseTaskExecution = (value: unknown, label: string): TaskExecution => {
  const execution = objectRecord(value, label);
  if ("agentRunId" in execution) {
    requireKeys(execution, ["address", "agentRunId", "platformAgentRunId", "startedAt"], label);
    return {
      address: canonicalNonRootAddress(execution.address, `${label}.address`),
      agentRunId: requiredString(execution.agentRunId, `${label}.agentRunId`),
      platformAgentRunId: nullableString(execution.platformAgentRunId, `${label}.platformAgentRunId`),
      ...(execution.taskLifetime === undefined ? {} : { taskLifetime: parseTaskLifetimeStamp(execution.taskLifetime) }),
      ...parseDelegator(execution, label),
      startedAt: isoTimestamp(execution.startedAt, `${label}.startedAt`),
      ...parseTaskAgentExecutionSource(execution, label),
    };
  }
  requireKeys(execution, ["address", "teamRunId", "members", "taskExecutions", "startedAt"], label);
  const address = canonicalNonRootAddress(execution.address, `${label}.address`);
  return {
    address,
    teamRunId: requiredString(execution.teamRunId, `${label}.teamRunId`),
    members: requiredArray(execution.members, `${label}.members`).map((member, index) =>
      parseTaskTeamMember(member, `${label}.members[${index}]`)),
    taskExecutions: parseTaskExecutions(execution.taskExecutions, `${label}.taskExecutions`),
    ...parseDelegator(execution, label),
    startedAt: isoTimestamp(execution.startedAt, `${label}.startedAt`),
    ...parseTaskTeamExecutionSource(execution, address, label),
    ...(execution.taskLifetime === undefined ? {} : { taskLifetime: parseTaskLifetimeStamp(execution.taskLifetime) }),
  };
};

export const parseTaskExecutions = (value: unknown, label: string): TaskExecution[] =>
  requiredArray(value, label).map((task, index) => parseTaskExecution(task, `${label}[${index}]`));

type TaskExecutionForestOwner = Readonly<{
  members: readonly unknown[];
  taskExecutions: readonly TaskExecution[];
}>;

/**
 * A task execution that records its delegator names an AgentRun in the same tree.
 * Callers pass every configured owner of task executions.
 */
export const validateTaskExecutionDelegators = (
  configuredAgentRunIds: Iterable<string>,
  owners: readonly TaskExecutionForestOwner[],
): void => {
  const agentRunIds = new Set(configuredAgentRunIds);
  const executions: TaskExecution[] = [];
  const visitMember = (member: TaskTeamMemberExecution): void => {
    if ("agentRunId" in member) {
      agentRunIds.add(member.agentRunId);
      return;
    }
    member.members.forEach(visitMember);
    member.taskExecutions.forEach(visitTask);
  };
  const visitTask = (task: TaskExecution): void => {
    executions.push(task);
    if ("agentRunId" in task) {
      agentRunIds.add(task.agentRunId);
      return;
    }
    task.members.forEach(visitMember);
    task.taskExecutions.forEach(visitTask);
  };
  owners.forEach((owner) => owner.taskExecutions.forEach(visitTask));
  for (const execution of executions) {
    if (execution.delegatorAgentRunId !== undefined && !agentRunIds.has(execution.delegatorAgentRunId)) {
      const runId = "agentRunId" in execution ? execution.agentRunId : execution.teamRunId;
      throw new Error(`Task execution '${runId}' delegator '${execution.delegatorAgentRunId}' is not an AgentRun in this tree.`);
    }
  }
};

export const parseApplicationBinding = (value: unknown): TeamRunApplicationBinding | null => {
  if (value === null) return null;
  const binding = objectRecord(value, "applicationBinding");
  requireKeys(binding, ["applicationId", "bindingId"], "applicationBinding");
  return {
    applicationId: requiredString(binding.applicationId, "applicationBinding.applicationId"),
    bindingId: requiredString(binding.bindingId, "applicationBinding.bindingId"),
  };
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

const rootLevelAddress = (value: unknown, label: string): AgentTeamAddress => {
  const address = canonicalNonRootAddress(value, label);
  if (getParentAgentTeamAddress(address) !== "/") throw new Error(`${label} must be a root-level address.`);
  return address;
};

const parseCollaboratorTeamMember = (
  value: unknown,
  teamAddress: AgentTeamAddress,
  label: string,
): CollaboratorTeamMember => {
  const member = objectRecord(value, label);
  requireKeys(member, ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"], label);
  const address = canonicalNonRootAddress(member.address, `${label}.address`);
  if (getParentAgentTeamAddress(address) !== teamAddress) {
    throw new Error(`${label}.address '${address}' is not a direct member of '${teamAddress}'.`);
  }
  return {
    address,
    agentDefinitionId: requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`),
    agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
  };
};

export const parseCollaboratorEntry = (value: unknown, label: string): CollaboratorEntry => {
  const entry = objectRecord(value, label);
  if (entry.kind === "agent") {
    requireKeys(entry, [
      "kind", "address", "agentDefinitionId", "agentRunId", "platformAgentRunId", "launchConfiguration",
      "addedAt", "addedViaAgentRunId",
    ], label);
    return {
      kind: "agent",
      address: rootLevelAddress(entry.address, `${label}.address`),
      agentDefinitionId: requiredString(entry.agentDefinitionId, `${label}.agentDefinitionId`),
      agentRunId: requiredString(entry.agentRunId, `${label}.agentRunId`),
      platformAgentRunId: nullableString(entry.platformAgentRunId, `${label}.platformAgentRunId`),
      launchConfiguration: parseLaunchConfiguration(entry.launchConfiguration, `${label}.launchConfiguration`),
      addedAt: isoTimestamp(entry.addedAt, `${label}.addedAt`),
      addedViaAgentRunId: requiredString(entry.addedViaAgentRunId, `${label}.addedViaAgentRunId`),
    };
  }
  if (entry.kind !== "agent_team") throw new Error(`${label}.kind must be 'agent' or 'agent_team'.`);
  requireKeys(entry, [
    "kind", "address", "teamDefinitionId", "teamRunId", "coordinatorAddress", "members", "handoffs",
    "defaultLaunchConfiguration", "taskExecutions", "addedAt", "addedViaAgentRunId",
  ], label);
  const address = rootLevelAddress(entry.address, `${label}.address`);
  const members = requiredArray(entry.members, `${label}.members`).map((member, index) =>
    parseCollaboratorTeamMember(member, address, `${label}.members[${index}]`));
  const memberAddresses = new Set(members.map((member) => member.address));
  if (memberAddresses.size !== members.length) throw new Error(`${label}.members repeat an address.`);
  const coordinatorAddress = canonicalNonRootAddress(entry.coordinatorAddress, `${label}.coordinatorAddress`);
  if (!memberAddresses.has(coordinatorAddress)) throw new Error(`${label}.coordinatorAddress is not one of its members.`);
  const handoffs = normalizeCollaborationHandoffs(entry.handoffs, `${label}.handoffs`);
  for (const handoff of handoffs) {
    if (!memberAddresses.has(handoff.from as AgentTeamAddress) || !memberAddresses.has(handoff.to as AgentTeamAddress)) {
      throw new Error(`${label} handoff '${handoff.from}' -> '${handoff.to}' leaves the Team.`);
    }
  }
  return {
    kind: "agent_team",
    address,
    teamDefinitionId: requiredString(entry.teamDefinitionId, `${label}.teamDefinitionId`),
    teamRunId: requiredString(entry.teamRunId, `${label}.teamRunId`),
    coordinatorAddress,
    members,
    handoffs,
    defaultLaunchConfiguration: parseLaunchConfiguration(entry.defaultLaunchConfiguration, `${label}.defaultLaunchConfiguration`),
    taskExecutions: parseTaskExecutions(entry.taskExecutions, `${label}.taskExecutions`),
    addedAt: isoTimestamp(entry.addedAt, `${label}.addedAt`),
    addedViaAgentRunId: requiredString(entry.addedViaAgentRunId, `${label}.addedViaAgentRunId`),
  };
};

/** `collaborators` is optional on read: an absent list truthfully means none were added. Writers always emit it. */
export const parseCollaborators = (value: unknown, label: string): CollaboratorEntry[] => {
  if (value === undefined) return [];
  return requiredArray(value, label).map((entry, index) => parseCollaboratorEntry(entry, `${label}[${index}]`));
};

/** Every run ID (AgentRun and TeamRun) inside a task execution forest. */
export const collectTaskExecutionRunIds = (tasks: readonly TaskExecution[]): string[] => {
  const ids: string[] = [];
  const visitMember = (member: TaskTeamMemberExecution): void => {
    if ("agentRunId" in member) { ids.push(member.agentRunId); return; }
    ids.push(member.teamRunId);
    member.members.forEach(visitMember);
    member.taskExecutions.forEach(visitTask);
  };
  const visitTask = (task: TaskExecution): void => {
    if ("agentRunId" in task) { ids.push(task.agentRunId); return; }
    ids.push(task.teamRunId);
    task.members.forEach(visitMember);
    task.taskExecutions.forEach(visitTask);
  };
  tasks.forEach(visitTask);
  return ids;
};

/**
 * Collaborator invariants shared by every tree family:
 * - addresses are unique and never collide with a configured (or host) address;
 * - collaborator run IDs are unique and never collide with any other run ID of the tree;
 * - an extra copy (a task execution at a collaborator address) has the collaborator's kind
 *   and, for a Team, its member layout; a catalog copy (with `source`) has its own source's.
 * `owners` are every holder of task executions outside the collaborators themselves.
 */
export const validateCollaboratorInvariants = (input: Readonly<{
  collaborators: readonly CollaboratorEntry[];
  reservedAddresses: Iterable<string>;
  /** Run IDs of the tree outside the collaborator entries (root, configured members, task executions). */
  otherRunIds: Iterable<string>;
  owners: readonly Readonly<{ taskExecutions: readonly TaskExecution[] }>[];
}>): void => {
  const reserved = new Set(input.reservedAddresses);
  const runIds = new Set(input.otherRunIds);
  const claim = (runId: string): void => {
    if (runIds.has(runId)) throw new Error(`Duplicate run ID '${runId}'.`);
    runIds.add(runId);
  };
  const byAddress = new Map<string, CollaboratorEntry>();
  for (const entry of input.collaborators) {
    if (byAddress.has(entry.address)) throw new Error(`Duplicate collaborator address '${entry.address}'.`);
    if (reserved.has(entry.address)) throw new Error(`Collaborator address '${entry.address}' collides with a configured placement.`);
    if (entry.kind === "agent") claim(entry.agentRunId);
    else {
      claim(entry.teamRunId);
      for (const member of entry.members) {
        if (reserved.has(member.address)) throw new Error(`Collaborator member '${member.address}' collides with a configured placement.`);
        claim(member.agentRunId);
      }
      collectTaskExecutionRunIds(entry.taskExecutions).forEach(claim);
    }
    byAddress.set(entry.address, entry);
  }
  const visit = (task: TaskExecution): void => {
    const entry = task.source ? null : byAddress.get(task.address);
    if ("teamRunId" in task && task.source) {
      const layout = new Set<string>(task.source.members.map((member) => member.address));
      if (task.members.length !== layout.size || task.members.some((member) => !layout.has(member.address))) {
        throw new Error(`Task TeamRun '${task.teamRunId}' does not match its catalog source.`);
      }
    }
    if (entry) {
      if (entry.kind === "agent" && !("agentRunId" in task)) {
        throw new Error(`Task execution at collaborator '${task.address}' must be an Agent.`);
      }
      if (entry.kind === "agent_team") {
        if (!("teamRunId" in task)) throw new Error(`Task execution at collaborator '${task.address}' must be a Team.`);
        const layout = new Set(entry.members.map((member) => member.address));
        if (task.members.length !== layout.size || task.members.some((member) => !layout.has(member.address))) {
          throw new Error(`Task TeamRun '${task.teamRunId}' does not match collaborator '${task.address}'.`);
        }
      }
    }
    if ("teamRunId" in task) task.taskExecutions.forEach(visit);
  };
  [...input.owners, ...input.collaborators.filter(isCollaboratorTeamEntry)]
    .forEach((owner) => owner.taskExecutions.forEach(visit));
};

/** Task-execution owners inside collaborator Teams, for delegator validation (their members delegate). */
export const collaboratorTaskOwners = (
  collaborators: readonly CollaboratorEntry[],
): readonly Readonly<{ members: readonly unknown[]; taskExecutions: readonly TaskExecution[] }>[] =>
  collaborators.filter(isCollaboratorTeamEntry);

export const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};
