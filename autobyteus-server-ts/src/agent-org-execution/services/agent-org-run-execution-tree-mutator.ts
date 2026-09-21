import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { TaskExecutionHostIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

type TeamWithTasks = ConfiguredTeamExecutionNode | TaskTeamExecution | TaskTeamNestedTeamExecution;

const mapTeam = (
  team: TeamWithTasks,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): TeamWithTasks => {
  if (team.teamRunId === targetTeamRunId) return change(team);
  const members = team.members.map((member) => "agentRunId" in member
    ? member
    : mapTeam(member, targetTeamRunId, change) as TaskTeamNestedTeamExecution);
  const taskExecutions = team.taskExecutions.map((task) => "agentRunId" in task
    ? task
    : mapTeam(task, targetTeamRunId, change) as TaskTeamExecution);
  return { ...team, members, taskExecutions } as TeamWithTasks;
};

export const addAgentOrgTaskExecution = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  host: TaskExecutionHostIdentity;
  execution: TaskExecution;
}): AgentOrgRunExecutionTreeSnapshot => {
  if (input.host.root.rootSubjectKind !== "agent_org"
    || input.host.root.rootRunId !== input.tree.rootOrg.orgRunId) {
    throw new Error("Task host belongs to a different AgentOrg root.");
  }
  const append = <T extends { taskExecutions: readonly TaskExecution[] }>(owner: T): T => {
    const runId = "agentRunId" in input.execution ? input.execution.agentRunId : input.execution.teamRunId;
    if (owner.taskExecutions.some((task) => ("agentRunId" in task ? task.agentRunId : task.teamRunId) === runId)) {
      throw new Error(`Task execution '${runId}' is already present in its host.`);
    }
    return { ...owner, taskExecutions: [...owner.taskExecutions, input.execution] };
  };
  if (input.host.hostKind === "root") {
    return validateAgentOrgRunExecutionTreePayload({
      ...input.tree,
      rootOrg: append(input.tree.rootOrg),
    }, input.tree.rootOrg.orgRunId);
  }
  let found = false;
  const change = (team: TeamWithTasks): TeamWithTasks => {
    found = true;
    return append(team);
  };
  const members = input.tree.rootOrg.members.map((member): ConfiguredExecutionNode =>
    "agentRunId" in member ? member : mapTeam(member, input.host.hostRunId, change) as ConfiguredTeamExecutionNode);
  const tasks = input.tree.rootOrg.taskExecutions.map((task): TaskExecution =>
    "agentRunId" in task ? task : mapTeam(task, input.host.hostRunId, change) as TaskTeamExecution);
  if (!found) throw new Error(`Task host TeamRun '${input.host.hostRunId}' was not found.`);
  return validateAgentOrgRunExecutionTreePayload({
    ...input.tree,
    rootOrg: { ...input.tree.rootOrg, members, taskExecutions: tasks },
  }, input.tree.rootOrg.orgRunId);
};

export const settleAgentOrgTaskExecution = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  taskExecutionRunId: string;
  settledAt: string;
}): AgentOrgRunExecutionTreeSnapshot => {
  let found = false;
  const task = (value: TaskExecution): TaskExecution => {
    const matches = ("agentRunId" in value ? value.agentRunId : value.teamRunId) === input.taskExecutionRunId;
    if (matches) {
      if (found) throw new Error(`Task execution '${input.taskExecutionRunId}' is duplicated.`);
      found = true;
      return { ...value, settledAt: input.settledAt };
    }
    return "agentRunId" in value ? value : {
      ...value,
      members: value.members.map(member),
      taskExecutions: value.taskExecutions.map(task),
    };
  };
  const member = (value: TaskTeamMemberExecution): TaskTeamMemberExecution => "agentRunId" in value ? value : {
    ...value,
    members: value.members.map(member),
    taskExecutions: value.taskExecutions.map(task),
  };
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? value : {
    ...value,
    taskExecutions: value.taskExecutions.map(task),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
      taskExecutions: input.tree.rootOrg.taskExecutions.map(task),
    },
  };
  if (!found) throw new Error(`Task execution '${input.taskExecutionRunId}' was not found.`);
  return validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId);
};

type AgentNode = ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution;
export const adoptAgentOrgPlatformBinding = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  binding: CollaborationAgentPlatformBinding;
}): Readonly<{ outcome: "adopted" | "unchanged"; tree: AgentOrgRunExecutionTreeSnapshot }> => {
  const identity = input.binding.execution;
  if (identity.root.rootSubjectKind !== "agent_org" || identity.root.rootRunId !== input.tree.rootOrg.orgRunId) {
    throw new Error("Platform binding belongs to a different AgentOrg root.");
  }
  let matches = 0;
  let changed = false;
  const agent = <T extends AgentNode>(value: T): T => {
    if (value.agentRunId !== identity.agentRunId || value.address !== identity.memberAddress) return value;
    matches += 1;
    if (value.platformAgentRunId === input.binding.platformAgentRunId) return value;
    if (value.platformAgentRunId !== null) throw new Error("AgentOrg execution already has a different platform binding.");
    changed = true;
    return { ...value, platformAgentRunId: input.binding.platformAgentRunId };
  };
  const taskMember = (value: TaskTeamMemberExecution): TaskTeamMemberExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(taskMember),
    taskExecutions: value.taskExecutions.map(task),
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(taskMember),
    taskExecutions: value.taskExecutions.map(task),
  };
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
    taskExecutions: value.taskExecutions.map(task),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
      taskExecutions: input.tree.rootOrg.taskExecutions.map(task),
    },
  };
  if (matches !== 1) throw new Error("Platform binding target was not found exactly once in AgentOrg tree.");
  if (!changed) return Object.freeze({ outcome: "unchanged", tree: input.tree });
  return Object.freeze({
    outcome: "adopted",
    tree: validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId),
  });
};

export const replaceAgentOrgPlatformBindingWithoutConversation = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  replacement: CollaborationAgentNoConversationBindingReplacement;
}): AgentOrgRunExecutionTreeSnapshot => {
  const identity = input.replacement.binding.execution;
  if (identity.root.rootSubjectKind !== "agent_org" || identity.root.rootRunId !== input.tree.rootOrg.orgRunId) {
    throw new Error("Platform binding replacement belongs to a different AgentOrg root.");
  }
  let matches = 0;
  const agent = <T extends AgentNode>(value: T): T => {
    if (value.agentRunId !== identity.agentRunId || value.address !== identity.memberAddress) return value;
    matches += 1;
    if (value.platformAgentRunId !== input.replacement.expectedPreviousPlatformAgentRunId) {
      throw new Error("AgentOrg no-conversation binding replacement does not match the persisted provider binding.");
    }
    return { ...value, platformAgentRunId: input.replacement.binding.platformAgentRunId };
  };
  const taskMember = (value: TaskTeamMemberExecution): TaskTeamMemberExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(taskMember),
    taskExecutions: value.taskExecutions.map(task),
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(taskMember),
    taskExecutions: value.taskExecutions.map(task),
  };
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
    taskExecutions: value.taskExecutions.map(task),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
      taskExecutions: input.tree.rootOrg.taskExecutions.map(task),
    },
  };
  if (matches !== 1) throw new Error("Platform binding replacement target was not found exactly once in AgentOrg tree.");
  return validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId);
};
