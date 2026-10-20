import {
  applyDelegatedLaunchSelectionsToTaskExecutions,
  type DelegatedLaunchForest,
  type DelegatedLaunchSelections,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type {
  TaskExecution,
  TaskTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import type { RemoteTaskAgentExecution } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { TeamAgentPlatformBindingError } from "../domain/team-agent-platform-binding.js";

/**
 * Appends a new task execution as a link of the coordinating run's top level. Every new task agent is
 * hosted by the root TeamRun (the team adapter's `planActivation`: CM-1 refuses targets inside the
 * delegator's own Team), and task agents created by task-team members are linked by the coordinating
 * run (CM-7, U-5); a task Team never holds task executions.
 */
export const addTaskExecutionToTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  execution: TaskExecution;
}): TeamRunExecutionTreeSnapshot => {
  const rootTeam = input.tree.rootTeam;
  if (rootTeam.taskExecutions.some((task) =>
    "agentRunId" in task
      ? "agentRunId" in input.execution && task.agentRunId === input.execution.agentRunId
      : "teamRunId" in input.execution && task.teamRunId === input.execution.teamRunId)) {
    throw new Error("Task execution is already present in the owner TeamRun.");
  }
  return validateTeamRunExecutionTreePayload({
    ...input.tree,
    rootTeam: { ...rootTeam, taskExecutions: [...rootTeam.taskExecutions, input.execution] },
  }, rootTeam.teamRunId);
};

/** Records a remote run an agent of this Team delegated to (CM-10), once, at its delegation's commit. */
export const addRemoteTaskExecutionToTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  link: RemoteTaskAgentExecution;
}): TeamRunExecutionTreeSnapshot => validateTeamRunExecutionTreePayload({
  ...input.tree,
  rootTeam: { ...input.tree.rootTeam, remoteTaskExecutions: [...(input.tree.rootTeam.remoteTaskExecutions ?? []), input.link] },
}, input.tree.rootTeam.teamRunId);

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
  const mapTask = (task: TaskExecution): TaskExecution =>
    "agentRunId" in task ? mapAgent(task) : {
      ...task,
      members: task.members.map(mapAgent),
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
  const mapTask = (task: TaskExecution): TaskExecution => "agentRunId" in task ? mapAgent(task) : {
    ...task,
    members: task.members.map(mapAgent),
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
