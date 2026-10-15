import {
  applyDelegatedLaunchSelectionsToTaskExecutions,
  type DelegatedLaunchForest,
  type DelegatedLaunchSelections,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type {
  RootConfiguredTeamExecutionNode,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import type { TeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { TeamAgentPlatformBindingError } from "../domain/team-agent-platform-binding.js";

type TeamWithTasks =
  | RootConfiguredTeamExecutionNode
  | TaskTeamNestedTeamExecution
  | Extract<TaskExecution, { teamRunId: string }>;

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
  const members = "teamDefinitionName" in team
    ? team.members
    : team.members.map((member) => mapTaskTeamMember(member, targetTeamRunId, change));
  const taskExecutions = team.taskExecutions.map((task) => mapTask(task, targetTeamRunId, change));
  return { ...team, members, taskExecutions } as TeamWithTasks;
};

/** Applies `change` to the owner TeamRun: the root or a task Team. */
const replaceRoot = (
  tree: TeamRunExecutionTreeSnapshot,
  targetTeamRunId: string,
  change: <T extends { taskExecutions: readonly TaskExecution[] }>(team: T) => T,
): TeamRunExecutionTreeSnapshot => {
  const rootTeam = mapTeam(tree.rootTeam, targetTeamRunId, change) as RootConfiguredTeamExecutionNode;
  return validateTeamRunExecutionTreePayload({ ...tree, rootTeam }, tree.rootTeam.teamRunId);
};

export const addTaskExecutionToTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  ownerTeamRunId: string;
  execution: TaskExecution;
}): TeamRunExecutionTreeSnapshot => replaceRoot(
  input.tree,
  input.ownerTeamRunId,
  <T extends { taskExecutions: readonly TaskExecution[] }>(team: T): T => {
    if (team.taskExecutions.some((task) =>
      "agentRunId" in task
        ? "agentRunId" in input.execution && task.agentRunId === input.execution.agentRunId
        : "teamRunId" in input.execution && task.teamRunId === input.execution.teamRunId)) {
      throw new Error("Task execution is already present in the owner TeamRun.");
    }
    return { ...team, taskExecutions: [...team.taskExecutions, input.execution] };
  },
);

type AgentExecutionNode = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;

export type TeamAgentPlatformBindingMutation = Readonly<{
  outcome: "adopted" | "unchanged";
  tree: TeamRunExecutionTreeSnapshot;
}>;

export const adoptAgentPlatformBindingInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  binding: TeamAgentPlatformBinding;
}): TeamAgentPlatformBindingMutation => {
  if (
    input.binding.execution.root.rootSubjectKind !== "agent_team"
    || input.binding.execution.root.rootRunId !== input.tree.rootTeam.teamRunId
  ) {
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
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapAgent),
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

export const replaceAgentPlatformBindingWithoutConversationInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  replacement: Readonly<{
    binding: TeamAgentPlatformBinding;
    expectedPreviousPlatformAgentRunId: string;
  }>;
}): TeamRunExecutionTreeSnapshot => {
  const identity = input.replacement.binding.execution;
  if (identity.root.rootSubjectKind !== "agent_team" || identity.root.rootRunId !== input.tree.rootTeam.teamRunId) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding replacement belongs to a different root TeamRun.",
    );
  }
  let matches = 0;
  const mapAgent = <T extends AgentExecutionNode>(agent: T): T => {
    if (agent.address !== identity.memberAddress || agent.agentRunId !== identity.agentRunId) return agent;
    matches += 1;
    if (agent.platformAgentRunId !== input.replacement.expectedPreviousPlatformAgentRunId) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The no-conversation binding replacement does not match the persisted provider binding.",
      );
    }
    return { ...agent, platformAgentRunId: input.replacement.binding.platformAgentRunId };
  };
  const mapTaskMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecution =>
    "agentRunId" in member ? mapAgent(member) : {
      ...member,
      members: member.members.map(mapTaskMember),
      taskExecutions: member.taskExecutions.map(mapTask),
    };
  const mapTask = (task: TaskExecution): TaskExecution => "agentRunId" in task ? mapAgent(task) : {
    ...task,
    members: task.members.map(mapTaskMember),
    taskExecutions: task.taskExecutions.map(mapTask),
  } as TaskTeamExecution;
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapAgent),
      taskExecutions: input.tree.rootTeam.taskExecutions.map(mapTask),
    },
  };
  if (matches !== 1) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding replacement target was not found in the execution tree.",
    );
  }
  return validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId);
};

/** The tree's delegated copies, for the user model choice and Stop (DS-001, DS-002). */
export const teamDelegatedLaunchForest = (tree: TeamRunExecutionTreeSnapshot): DelegatedLaunchForest => Object.freeze({
  taskExecutionLists: taskExecutionListsOf({ taskExecutions: tree.rootTeam.taskExecutions }),
});

/** Records user model choices on the tree's copies; started values are untouched. */
export const applyTeamDelegatedLaunchSelections = (
  tree: TeamRunExecutionTreeSnapshot,
  selections: DelegatedLaunchSelections,
): TeamRunExecutionTreeSnapshot => validateTeamRunExecutionTreePayload({
  ...tree,
  rootTeam: {
    ...tree.rootTeam,
    taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(tree.rootTeam.taskExecutions, selections),
  },
}, tree.rootTeam.teamRunId);
