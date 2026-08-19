import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  ConfiguredAgentExecution,
  ConfiguredMemberExecution,
  ConfiguredTeamExecution,
  RootConfiguredTeamExecution,
  TaskExecution,
  TaskTeamMemberExecution,
  TeamRunExecutionTreeFileV1,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (
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

const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

const nullableString = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  return required(value, label);
};

const timestamp = (value: unknown, label: string): string => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized) ||
      Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};

const canonicalAddress = (value: unknown, label: string): AgentTeamAddress => {
  const address = assertAgentTeamAddress(required(value, label));
  if (address === "/") throw new Error(`${label} must be a non-root address.`);
  return address;
};

const array = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
};

const validateLaunchConfiguration = (value: unknown, label: string): void => {
  const launch = record(value, label);
  exactKeys(launch, [
    "runtimeKind",
    "llmModelIdentifier",
    "llmConfig",
    "autoExecuteTools",
    "skillAccessMode",
    "workspaceRootPath",
  ], label);
  if (!["AUTOBYTEUS", "CLAUDE", "CODEX"].includes(String(launch.runtimeKind))) {
    throw new Error(`${label}.runtimeKind is unsupported.`);
  }
  required(launch.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (launch.llmConfig !== null &&
      (!launch.llmConfig || typeof launch.llmConfig !== "object" || Array.isArray(launch.llmConfig))) {
    throw new Error(`${label}.llmConfig must be an object or null.`);
  }
  if (typeof launch.autoExecuteTools !== "boolean") {
    throw new Error(`${label}.autoExecuteTools must be boolean.`);
  }
  if (!Object.values(SkillAccessMode).includes(launch.skillAccessMode as SkillAccessMode)) {
    throw new Error(`${label}.skillAccessMode is unsupported.`);
  }
  if (launch.workspaceRootPath !== null) {
    required(launch.workspaceRootPath, `${label}.workspaceRootPath`);
  }
};

const validateConfiguredMember = (value: unknown, label: string): void => {
  const member = record(value, label);
  if ("agentRunId" in member) {
    exactKeys(member, [
      "address", "agentDefinitionId", "role", "description", "agentRunId",
      "platformAgentRunId", "launchConfiguration",
    ], label);
    canonicalAddress(member.address, `${label}.address`);
    required(member.agentDefinitionId, `${label}.agentDefinitionId`);
    nullableString(member.role, `${label}.role`);
    nullableString(member.description, `${label}.description`);
    required(member.agentRunId, `${label}.agentRunId`);
    nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`);
    validateLaunchConfiguration(member.launchConfiguration, `${label}.launchConfiguration`);
    return;
  }
  exactKeys(member, [
    "address", "teamDefinitionId", "role", "description", "teamRunId",
    "coordinatorAddress", "members", "taskExecutions",
  ], label);
  canonicalAddress(member.address, `${label}.address`);
  required(member.teamDefinitionId, `${label}.teamDefinitionId`);
  nullableString(member.role, `${label}.role`);
  nullableString(member.description, `${label}.description`);
  required(member.teamRunId, `${label}.teamRunId`);
  canonicalAddress(member.coordinatorAddress, `${label}.coordinatorAddress`);
  array(member.members, `${label}.members`).forEach((child, index) =>
    validateConfiguredMember(child, `${label}.members[${index}]`));
  array(member.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
    validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
};

const validateTaskTeamMember = (value: unknown, label: string): void => {
  const member = record(value, label);
  if ("agentRunId" in member) {
    exactKeys(member, ["address", "agentRunId", "platformAgentRunId"], label);
    canonicalAddress(member.address, `${label}.address`);
    required(member.agentRunId, `${label}.agentRunId`);
    nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`);
    return;
  }
  exactKeys(member, ["address", "teamRunId", "members", "taskExecutions"], label);
  canonicalAddress(member.address, `${label}.address`);
  required(member.teamRunId, `${label}.teamRunId`);
  array(member.members, `${label}.members`).forEach((child, index) =>
    validateTaskTeamMember(child, `${label}.members[${index}]`));
  array(member.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
    validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
};

const validateTaskExecution = (value: unknown, label: string): void => {
  const execution = record(value, label);
  if ("agentRunId" in execution) {
    exactKeys(execution, [
      "address", "agentRunId", "platformAgentRunId", "startedAt", "settledAt",
    ], label);
    canonicalAddress(execution.address, `${label}.address`);
    required(execution.agentRunId, `${label}.agentRunId`);
    nullableString(execution.platformAgentRunId, `${label}.platformAgentRunId`);
  } else {
    exactKeys(execution, [
      "address", "teamRunId", "members", "taskExecutions", "startedAt", "settledAt",
    ], label);
    canonicalAddress(execution.address, `${label}.address`);
    required(execution.teamRunId, `${label}.teamRunId`);
    array(execution.members, `${label}.members`).forEach((member, index) =>
      validateTaskTeamMember(member, `${label}.members[${index}]`));
    array(execution.taskExecutions, `${label}.taskExecutions`).forEach((task, index) =>
      validateTaskExecution(task, `${label}.taskExecutions[${index}]`));
  }
  const startedAt = timestamp(execution.startedAt, `${label}.startedAt`);
  if (execution.settledAt !== null) {
    const settledAt = timestamp(execution.settledAt, `${label}.settledAt`);
    if (settledAt < startedAt) throw new Error(`${label}.settledAt precedes startedAt.`);
  }
};

const validateRootTeam = (value: unknown): void => {
  const root = record(value, "rootTeam");
  exactKeys(root, [
    "teamDefinitionId", "teamDefinitionName", "teamRunId", "coordinatorAddress",
    "members", "taskExecutions",
  ], "rootTeam");
  required(root.teamDefinitionId, "rootTeam.teamDefinitionId");
  required(root.teamDefinitionName, "rootTeam.teamDefinitionName");
  required(root.teamRunId, "rootTeam.teamRunId");
  canonicalAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  array(root.members, "rootTeam.members").forEach((member, index) =>
    validateConfiguredMember(member, `rootTeam.members[${index}]`));
  array(root.taskExecutions, "rootTeam.taskExecutions").forEach((task, index) =>
    validateTaskExecution(task, `rootTeam.taskExecutions[${index}]`));
};

type ConfiguredPlacement = ConfiguredMemberExecution;

const validateTreeInvariants = (tree: TeamRunExecutionTreeFileV1): void => {
  const configured = new Map<AgentTeamAddress, ConfiguredPlacement>();
  const agentRuns = new Set<string>();
  const teamRuns = new Set<string>();

  const addAgentRun = (runId: string): void => {
    if (agentRuns.has(runId)) throw new Error(`Duplicate AgentRun ID '${runId}'.`);
    agentRuns.add(runId);
  };
  const addTeamRun = (runId: string): void => {
    if (teamRuns.has(runId)) throw new Error(`Duplicate TeamRun ID '${runId}'.`);
    teamRuns.add(runId);
  };

  const visitConfigured = (
    member: ConfiguredMemberExecution,
    parentAddress: AgentTeamAddress | "/",
  ): void => {
    if (getParentAgentTeamAddress(member.address) !== parentAddress) {
      throw new Error(`Configured placement '${member.address}' is not a direct child of '${parentAddress}'.`);
    }
    if (configured.has(member.address)) throw new Error(`Duplicate configured address '${member.address}'.`);
    configured.set(member.address, member);
    if ("agentRunId" in member) {
      addAgentRun(member.agentRunId);
      return;
    }
    addTeamRun(member.teamRunId);
    const coordinator = member.members.find((child) =>
      "agentRunId" in child && child.address === member.coordinatorAddress);
    if (!coordinator) throw new Error(`Configured Team '${member.address}' has no direct coordinator Agent.`);
    member.members.forEach((child) => visitConfigured(child, member.address));
  };

  addTeamRun(tree.rootTeam.teamRunId);
  tree.rootTeam.members.forEach((member) => visitConfigured(member, "/"));
  const rootCoordinator = tree.rootTeam.members.find((member) =>
    "agentRunId" in member && member.address === tree.rootTeam.coordinatorAddress);
  if (!rootCoordinator) throw new Error("rootTeam has no direct coordinator Agent.");

  const visitTaskTeamMember = (
    member: TaskTeamMemberExecution,
    sourceTeam: ConfiguredTeamExecution | RootConfiguredTeamExecution,
  ): void => {
    const source = sourceTeam.members.find((candidate) => candidate.address === member.address);
    if (!source || ("agentRunId" in source) !== ("agentRunId" in member)) {
      throw new Error(`Task-Team member '${member.address}' does not match a direct configured member.`);
    }
    if ("agentRunId" in member) {
      addAgentRun(member.agentRunId);
      return;
    }
    addTeamRun(member.teamRunId);
    const configuredTeam = source as ConfiguredTeamExecution;
    member.members.forEach((child) => visitTaskTeamMember(child, configuredTeam));
    member.taskExecutions.forEach((task) => visitTask(task, member.teamRunId));
  };

  const visitTask = (task: TaskExecution, ownerTeamRunId: string): void => {
    void ownerTeamRunId;
    const source = configured.get(task.address);
    if (!source || ("agentRunId" in source) !== ("agentRunId" in task)) {
      throw new Error(`Task execution '${task.address}' does not match a configured placement.`);
    }
    if ("agentRunId" in task) {
      addAgentRun(task.agentRunId);
      return;
    }
    addTeamRun(task.teamRunId);
    const configuredTeam = source as ConfiguredTeamExecution;
    task.members.forEach((member) => visitTaskTeamMember(member, configuredTeam));
    task.taskExecutions.forEach((child) => visitTask(child, task.teamRunId));
  };

  const visitOwnedTasks = (team: RootConfiguredTeamExecution | ConfiguredTeamExecution): void => {
    team.taskExecutions.forEach((task) => visitTask(task, team.teamRunId));
    team.members.forEach((member) => {
      if ("teamRunId" in member) visitOwnedTasks(member);
    });
  };
  visitOwnedTasks(tree.rootTeam);

  for (const handoff of tree.handoffs) {
    const from = assertAgentTeamAddress(handoff.from);
    const to = assertAgentTeamAddress(handoff.to);
    if (!(configured.get(from) && "agentRunId" in configured.get(from)!)) {
      throw new Error(`Handoff sender '${from}' is not a configured Agent.`);
    }
    if (!configured.has(to)) throw new Error(`Handoff recipient '${to}' is not configured.`);
  }
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

export const validateTeamRunExecutionTreePayload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamRunExecutionTreeFileV1 => {
  const payload = record(value, "TeamRun execution tree");
  exactKeys(payload, [
    "schemaVersion", "createdAt", "archivedAt", "applicationBinding", "handoffs", "rootTeam",
  ], "TeamRun execution tree");
  if (payload.schemaVersion !== 1) throw new Error("TeamRun execution tree schemaVersion must be 1.");
  timestamp(payload.createdAt, "createdAt");
  if (payload.archivedAt !== null) timestamp(payload.archivedAt, "archivedAt");
  if (payload.applicationBinding !== null) {
    const binding = record(payload.applicationBinding, "applicationBinding");
    exactKeys(binding, ["applicationId", "bindingId"], "applicationBinding");
    required(binding.applicationId, "applicationBinding.applicationId");
    required(binding.bindingId, "applicationBinding.bindingId");
  }
  const handoffs = normalizeCollaborationHandoffs(payload.handoffs);
  validateRootTeam(payload.rootTeam);
  const cloned = structuredClone({ ...payload, handoffs }) as unknown as TeamRunExecutionTreeFileV1;
  if (expectedRootTeamRunId && cloned.rootTeam.teamRunId !== expectedRootTeamRunId) {
    throw new Error(`Execution tree root '${cloned.rootTeam.teamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  validateTreeInvariants(cloned);
  return deepFreeze(cloned);
};
