import type {
  ConfiguredMemberExecution,
  ConfiguredTeamExecution,
  RootConfiguredTeamExecution,
  TaskExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";

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
