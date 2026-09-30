import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type {
  CollaboratorEntry,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamMemberExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentRunCollaborationTreePayload } from "../../run-history/store/agent-run-collaboration-tree-schema.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";

const revalidate = (tree: AgentRunCollaborationTreeSnapshot): AgentRunCollaborationTreeSnapshot =>
  validateAgentRunCollaborationTreePayload(tree, tree.host.agentRunId);

export const addAgentRunCollaborators = (input: {
  tree: AgentRunCollaborationTreeSnapshot;
  collaborators: readonly CollaboratorEntry[];
}): AgentRunCollaborationTreeSnapshot => revalidate({
  ...input.tree,
  collaborators: [...input.tree.collaborators, ...input.collaborators],
});

/** Every Agent-root task execution is hosted by the root. */
export const addAgentRunTaskExecution = (input: {
  tree: AgentRunCollaborationTreeSnapshot;
  execution: TaskExecution;
}): AgentRunCollaborationTreeSnapshot => {
  const runId = "agentRunId" in input.execution ? input.execution.agentRunId : input.execution.teamRunId;
  if (input.tree.taskExecutions.some((task) => ("agentRunId" in task ? task.agentRunId : task.teamRunId) === runId)) {
    throw new Error(`Task execution '${runId}' is already present in the Agent root.`);
  }
  return revalidate({ ...input.tree, taskExecutions: [...input.tree.taskExecutions, input.execution] });
};

type AgentNode = TaskAgentExecution | TaskTeamAgentExecution;

const mapAgents = (
  tree: AgentRunCollaborationTreeSnapshot,
  agent: <T extends AgentNode>(value: T) => T,
): AgentRunCollaborationTreeSnapshot => {
  const member = (value: TaskTeamMemberExecution): TaskTeamMemberExecution => "agentRunId" in value ? agent(value) : {
    ...value, members: value.members.map(member), taskExecutions: value.taskExecutions.map(task),
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value, members: value.members.map(member), taskExecutions: value.taskExecutions.map(task),
  };
  return { ...tree, taskExecutions: tree.taskExecutions.map(task) };
};

const assertRoot = (tree: AgentRunCollaborationTreeSnapshot, root: CollaborationAgentPlatformBinding["execution"]["root"]): void => {
  if (root.rootSubjectKind !== "agent" || root.rootRunId !== tree.host.agentRunId) {
    throw new Error("Platform binding belongs to a different Agent root.");
  }
};

export const adoptAgentRunPlatformBinding = (input: {
  tree: AgentRunCollaborationTreeSnapshot;
  binding: CollaborationAgentPlatformBinding;
}): Readonly<{ outcome: "adopted" | "unchanged"; tree: AgentRunCollaborationTreeSnapshot }> => {
  const identity = input.binding.execution;
  assertRoot(input.tree, identity.root);
  let matches = 0;
  let changed = false;
  const next = mapAgents(input.tree, (value) => {
    if (value.agentRunId !== identity.agentRunId || value.address !== identity.memberAddress) return value;
    matches += 1;
    if (value.platformAgentRunId === input.binding.platformAgentRunId) return value;
    if (value.platformAgentRunId !== null) throw new Error("Agent-root execution already has a different platform binding.");
    changed = true;
    return { ...value, platformAgentRunId: input.binding.platformAgentRunId };
  });
  if (matches !== 1) throw new Error("Platform binding target was not found exactly once in the Agent-root tree.");
  return Object.freeze(changed
    ? { outcome: "adopted" as const, tree: revalidate(next) }
    : { outcome: "unchanged" as const, tree: input.tree });
};

export const replaceAgentRunPlatformBindingWithoutConversation = (input: {
  tree: AgentRunCollaborationTreeSnapshot;
  replacement: CollaborationAgentNoConversationBindingReplacement;
}): AgentRunCollaborationTreeSnapshot => {
  const identity = input.replacement.binding.execution;
  assertRoot(input.tree, identity.root);
  let matches = 0;
  const next = mapAgents(input.tree, (value) => {
    if (value.agentRunId !== identity.agentRunId || value.address !== identity.memberAddress) return value;
    matches += 1;
    if (value.platformAgentRunId !== input.replacement.expectedPreviousPlatformAgentRunId) {
      throw new Error("Agent-root no-conversation binding replacement does not match the persisted provider binding.");
    }
    return { ...value, platformAgentRunId: input.replacement.binding.platformAgentRunId };
  });
  if (matches !== 1) throw new Error("Platform binding replacement target was not found exactly once in the Agent-root tree.");
  return revalidate(next);
};
