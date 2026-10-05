import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { TaskExecutionHostIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  CollaboratorEntry,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { mapCollaboratorEntries } from "../../run-history/domain/collaborator-entry-tree-mapping.js";
import { validateStandaloneRootTreePayload } from "../persistence/standalone-root-tree-schema.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";

const revalidate = (tree: StandaloneRootTreeSnapshot): StandaloneRootTreeSnapshot =>
  validateStandaloneRootTreePayload(tree, tree.host.agentRunId);

export const addStandaloneRootCollaborators = (input: {
  tree: StandaloneRootTreeSnapshot;
  collaborators: readonly CollaboratorEntry[];
}): StandaloneRootTreeSnapshot => revalidate({
  ...input.tree,
  collaborators: [...input.tree.collaborators, ...input.collaborators],
});

/**
 * Appends a task execution to its host: the root, a task Team, or a collaborator Team (which
 * hosts its members' delegations).
 */
export const addStandaloneRootTaskExecution = (input: {
  tree: StandaloneRootTreeSnapshot;
  host: TaskExecutionHostIdentity;
  execution: TaskExecution;
}): StandaloneRootTreeSnapshot => {
  const runId = "agentRunId" in input.execution ? input.execution.agentRunId : input.execution.teamRunId;
  const append = <T extends { taskExecutions: readonly TaskExecution[] }>(owner: T): T => {
    if (owner.taskExecutions.some((task) => ("agentRunId" in task ? task.agentRunId : task.teamRunId) === runId)) {
      throw new Error(`Task execution '${runId}' is already present in its host.`);
    }
    return { ...owner, taskExecutions: [...owner.taskExecutions, input.execution] };
  };
  if (input.host.hostKind === "root") return revalidate(append(input.tree));
  let found = false;
  const team = <T extends TaskTeamExecution | TaskTeamNestedTeamExecution>(value: T): T => {
    if (value.teamRunId === input.host.hostRunId) {
      found = true;
      return append(value);
    }
    return {
      ...value,
      members: value.members.map((member) => "agentRunId" in member ? member : team(member)),
      taskExecutions: value.taskExecutions.map(task),
    };
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? value : team(value);
  const taskExecutions = input.tree.taskExecutions.map(task);
  const collaborators = input.tree.collaborators.map((entry) => {
    if (entry.kind === "agent") return entry;
    if (entry.teamRunId === input.host.hostRunId) {
      found = true;
      return append(entry);
    }
    return { ...entry, taskExecutions: entry.taskExecutions.map(task) };
  });
  if (!found) throw new Error(`Task host TeamRun '${input.host.hostRunId}' was not found in the Agent root.`);
  return revalidate({ ...input.tree, taskExecutions, collaborators });
};

type AgentNode = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;

const mapAgents = (
  tree: StandaloneRootTreeSnapshot,
  agent: <T extends AgentNode>(value: T) => T,
): StandaloneRootTreeSnapshot => {
  const member = (value: TaskTeamMemberExecution): TaskTeamMemberExecution => "agentRunId" in value ? agent(value) : {
    ...value, members: value.members.map(member), taskExecutions: value.taskExecutions.map(task),
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value, members: value.members.map(member), taskExecutions: value.taskExecutions.map(task),
  };
  return {
    ...tree,
    taskExecutions: tree.taskExecutions.map(task),
    collaborators: mapCollaboratorEntries(tree.collaborators, { agent, task }),
  };
};

const assertRoot = (tree: StandaloneRootTreeSnapshot, root: CollaborationAgentPlatformBinding["execution"]["root"]): void => {
  if (root.rootSubjectKind !== "agent" || root.rootRunId !== tree.host.agentRunId) {
    throw new Error("Platform binding belongs to a different Agent root.");
  }
};

export const adoptStandaloneRootPlatformBinding = (input: {
  tree: StandaloneRootTreeSnapshot;
  binding: CollaborationAgentPlatformBinding;
}): Readonly<{ outcome: "adopted" | "unchanged"; tree: StandaloneRootTreeSnapshot }> => {
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

export const replaceStandaloneRootPlatformBindingWithoutConversation = (input: {
  tree: StandaloneRootTreeSnapshot;
  replacement: CollaborationAgentNoConversationBindingReplacement;
}): StandaloneRootTreeSnapshot => {
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
