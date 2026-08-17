import type {
  ConfiguredAgentExecution,
  ConfiguredMemberExecution,
  ConfiguredTeamExecution,
  RootConfiguredTeamExecution,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import type { TeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { TeamAgentPlatformBindingError } from "../domain/team-agent-platform-binding.js";

type TeamWithTasks =
  | RootConfiguredTeamExecution
  | ConfiguredTeamExecution
  | TaskTeamNestedTeamExecution
  | Extract<TaskExecution, { teamRunId: string }>;

const mapConfiguredMember = (
  member: ConfiguredMemberExecution,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): ConfiguredMemberExecution => {
  if (!("teamRunId" in member)) return member;
  return mapTeam(member, targetTeamRunId, change) as ConfiguredTeamExecution;
};

const mapTaskTeamMember = (
  member: TaskTeamMemberExecution,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): TaskTeamMemberExecution => {
  if (!("teamRunId" in member)) return member;
  return mapTeam(member, targetTeamRunId, change) as TaskTeamNestedTeamExecution;
};

const mapTask = (
  task: TaskExecution,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): TaskExecution => {
  if (!("teamRunId" in task)) return task;
  return mapTeam(task, targetTeamRunId, change) as Extract<TaskExecution, { teamRunId: string }>;
};

const mapTeam = (
  team: TeamWithTasks,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): TeamWithTasks => {
  if (team.teamRunId === targetTeamRunId) return change(team);
  const members = team.members.map((member) =>
    "agentDefinitionId" in member || "role" in member
      ? mapConfiguredMember(member as ConfiguredMemberExecution, targetTeamRunId, change)
      : mapTaskTeamMember(member as TaskTeamMemberExecution, targetTeamRunId, change));
  const taskExecutions = team.taskExecutions.map((task) => mapTask(task, targetTeamRunId, change));
  return { ...team, members, taskExecutions } as TeamWithTasks;
};

const replaceRoot = (
  tree: TeamRunExecutionTreeSnapshot,
  targetTeamRunId: string,
  change: (team: TeamWithTasks) => TeamWithTasks,
): TeamRunExecutionTreeSnapshot => validateTeamRunExecutionTreePayload({
  ...tree,
  rootTeam: mapTeam(tree.rootTeam, targetTeamRunId, change),
}, tree.rootTeam.teamRunId);

export const addTaskExecutionToTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  ownerTeamRunId: string;
  execution: TaskExecution;
}): TeamRunExecutionTreeSnapshot => replaceRoot(
  input.tree,
  input.ownerTeamRunId,
  (team) => {
    if (team.taskExecutions.some((task) =>
      "agentRunId" in task
        ? "agentRunId" in input.execution && task.agentRunId === input.execution.agentRunId
        : "teamRunId" in input.execution && task.teamRunId === input.execution.teamRunId)) {
      throw new Error("Task execution is already present in the owner TeamRun.");
    }
    return { ...team, taskExecutions: [...team.taskExecutions, input.execution] } as TeamWithTasks;
  },
);

export const settleTaskExecutionInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  taskExecutionRunId: string;
  settledAt: string;
}): TeamRunExecutionTreeSnapshot => {
  let found = false;
  const settleTask = (task: TaskExecution): TaskExecution => {
    const matches = "agentRunId" in task
      ? task.agentRunId === input.taskExecutionRunId
      : task.teamRunId === input.taskExecutionRunId;
    if (matches) {
      if (found) throw new Error(`Task execution '${input.taskExecutionRunId}' is duplicated.`);
      found = true;
      return { ...task, settledAt: input.settledAt };
    }
    if (!("teamRunId" in task)) return task;
    return {
      ...task,
      members: task.members.map(settleMember),
      taskExecutions: task.taskExecutions.map(settleTask),
    };
  };
  const settleMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecution =>
    "agentRunId" in member ? member : {
      ...member,
      members: member.members.map(settleMember),
      taskExecutions: member.taskExecutions.map(settleTask),
    };
  const mapConfigured = (member: ConfiguredMemberExecution): ConfiguredMemberExecution =>
    "agentRunId" in member ? member : {
      ...member,
      members: member.members.map(mapConfigured),
      taskExecutions: member.taskExecutions.map(settleTask),
    };
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapConfigured),
      taskExecutions: input.tree.rootTeam.taskExecutions.map(settleTask),
    },
  };
  if (!found) throw new Error(`Task execution '${input.taskExecutionRunId}' was not found.`);
  return validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId);
};

type AgentExecutionNode = ConfiguredAgentExecution | TaskAgentExecution | TaskTeamAgentExecution;

export type TeamAgentPlatformBindingMutation = Readonly<{
  outcome: "adopted" | "unchanged";
  tree: TeamRunExecutionTreeSnapshot;
}>;

export const adoptAgentPlatformBindingInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  binding: TeamAgentPlatformBinding;
}): TeamAgentPlatformBindingMutation => {
  if (input.binding.execution.rootTeamRunId !== input.tree.rootTeam.teamRunId) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding belongs to a different root TeamRun.",
    );
  }
  let matches = 0;
  let changed = false;
  const mapAgent = <T extends AgentExecutionNode>(agent: T): T => {
    const identity = input.binding.execution;
    if (agent.address !== identity.memberAddress || agent.agentRunId !== identity.agentRunId) return agent;
    matches += 1;
    if (matches > 1) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The platform binding matched more than one execution-tree node.",
      );
    }
    if (agent.platformAgentRunId === input.binding.platformAgentRunId) return agent;
    if (agent.platformAgentRunId !== null) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The team agent execution already has a different provider binding.",
      );
    }
    changed = true;
    return { ...agent, platformAgentRunId: input.binding.platformAgentRunId };
  };
  const mapTaskMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecution =>
    "agentRunId" in member ? mapAgent(member) : {
      ...member,
      members: member.members.map(mapTaskMember),
      taskExecutions: member.taskExecutions.map(mapTask),
    };
  const mapTask = (task: TaskExecution): TaskExecution =>
    "agentRunId" in task ? mapAgent(task) : {
      ...task,
      members: task.members.map(mapTaskMember),
      taskExecutions: task.taskExecutions.map(mapTask),
    } as TaskTeamExecution;
  const mapConfigured = (member: ConfiguredMemberExecution): ConfiguredMemberExecution =>
    "agentRunId" in member ? mapAgent(member) : {
      ...member,
      members: member.members.map(mapConfigured),
      taskExecutions: member.taskExecutions.map(mapTask),
    };
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapConfigured),
      taskExecutions: input.tree.rootTeam.taskExecutions.map(mapTask),
    },
  };
  if (matches !== 1) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding target was not found in the execution tree.",
    );
  }
  if (!changed) return { outcome: "unchanged", tree: input.tree };
  return {
    outcome: "adopted",
    tree: validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId),
  };
};
