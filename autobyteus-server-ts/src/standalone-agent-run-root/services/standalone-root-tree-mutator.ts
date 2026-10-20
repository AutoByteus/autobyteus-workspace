import {
  applyDelegatedLaunchSelectionsToTaskExecutions,
  type DelegatedLaunchForest,
  type DelegatedLaunchSelections,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { RemoteTaskAgentExecution, TaskExecution } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateStandaloneRootTreePayload } from "../persistence/standalone-root-tree-schema.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";

const revalidate = (tree: StandaloneRootTreeSnapshot): StandaloneRootTreeSnapshot =>
  validateStandaloneRootTreePayload(tree, tree.host.agentRunId);

/**
 * Appends a new task execution as a link of the Agent root's top level: every new task agent is hosted by
 * the root (the adapter's `planActivation`), and a task Team never holds task executions (CM-7, U-5).
 */
export const addStandaloneRootTaskExecution = (input: {
  tree: StandaloneRootTreeSnapshot;
  execution: TaskExecution;
}): StandaloneRootTreeSnapshot => {
  const runId = "agentRunId" in input.execution ? input.execution.agentRunId : input.execution.teamRunId;
  if (input.tree.taskExecutions.some((task) => ("agentRunId" in task ? task.agentRunId : task.teamRunId) === runId)) {
    throw new Error(`Task execution '${runId}' is already present in its host.`);
  }
  return revalidate({ ...input.tree, taskExecutions: [...input.tree.taskExecutions, input.execution] });
};

/** Records a remote run the host delegated to (CM-10), once, at its delegation's commit. */
export const addStandaloneRootRemoteTaskExecution = (input: {
  tree: StandaloneRootTreeSnapshot;
  link: RemoteTaskAgentExecution;
}): StandaloneRootTreeSnapshot => revalidate({ ...input.tree, remoteTaskExecutions: [...(input.tree.remoteTaskExecutions ?? []), input.link] });

type AgentNode = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;

const mapAgents = (
  tree: StandaloneRootTreeSnapshot,
  agent: <T extends AgentNode>(value: T) => T,
): StandaloneRootTreeSnapshot => {
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value, members: value.members.map(agent), taskExecutions: value.taskExecutions.map(task),
  };
  return {
    ...tree,
    taskExecutions: tree.taskExecutions.map(task),
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

/** The tree's delegated copies, for the user model choice and Stop (DS-001, DS-002). */
export const standaloneDelegatedLaunchForest = (tree: StandaloneRootTreeSnapshot): DelegatedLaunchForest => Object.freeze({
  taskExecutionLists: taskExecutionListsOf({ taskExecutions: tree.taskExecutions }),
});

/** Records user model choices on the tree's copies; started values are untouched. */
export const applyStandaloneDelegatedLaunchSelections = (
  tree: StandaloneRootTreeSnapshot,
  selections: DelegatedLaunchSelections,
): StandaloneRootTreeSnapshot => revalidate({
  ...tree,
  taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(tree.taskExecutions, selections),
});
