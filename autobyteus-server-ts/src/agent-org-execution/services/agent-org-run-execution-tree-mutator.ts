import {
  applyDelegatedLaunchSelectionsToTaskExecutions,
  type DelegatedLaunchForest,
  type DelegatedLaunchSelections,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import { isConfiguredTeamExecution, type RemoteTaskExecution } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { commitRuntimeSwitchOnRecord } from "../../run-history/domain/runtime-selection-rule.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import type {
  CollaborationAgentNoConversationBindingReplacement,
  CollaborationAgentPlatformBinding,
  CollaborationAgentRuntimeSwitchCommit,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type {
  ConfiguredExecutionNode,
  TaskExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

/**
 * Appends a new task execution as a link of the organization run's top level: every new task agent is
 * hosted by the root (the adapter's `planActivation`); links of older ones under a configured team (C6)
 * stay where they are, and a task Team never holds task executions (CM-7, U-5).
 */
export const addAgentOrgTaskExecution = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  execution: TaskExecution;
}): AgentOrgRunExecutionTreeSnapshot => {
  const rootOrg = input.tree.rootOrg;
  const runId = "agentRunId" in input.execution ? input.execution.agentRunId : input.execution.teamRunId;
  if (rootOrg.taskExecutions.some((task) => ("agentRunId" in task ? task.agentRunId : task.teamRunId) === runId)) {
    throw new Error(`Task execution '${runId}' is already present in its host.`);
  }
  return validateAgentOrgRunExecutionTreePayload({
    ...input.tree,
    rootOrg: { ...rootOrg, taskExecutions: [...rootOrg.taskExecutions, input.execution] },
  }, rootOrg.orgRunId);
};

/** Records a remote run an agent of this Org delegated to (CM-10), once, at its delegation's commit. */
export const addAgentOrgRemoteTaskExecution = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  link: RemoteTaskExecution;
}): AgentOrgRunExecutionTreeSnapshot => validateAgentOrgRunExecutionTreePayload({
  ...input.tree,
  rootOrg: { ...input.tree.rootOrg, remoteTaskExecutions: [...(input.tree.rootOrg.remoteTaskExecutions ?? []), input.link] },
}, input.tree.rootOrg.orgRunId);

type AgentNode = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;
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
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
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
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
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

/**
 * autobyteus-348: the activation's commit of a switched member (direct Agents, Agents of mounted Teams and every task
 * execution list), through the shared record step; a missing or ambiguous member, or a stale switch ID, throws.
 */
export const commitAgentOrgRuntimeSwitch = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  commit: CollaborationAgentRuntimeSwitchCommit;
}): AgentOrgRunExecutionTreeSnapshot => {
  const { execution, switchId, platformAgentRunId } = input.commit;
  if (execution.root.rootSubjectKind !== "agent_org" || execution.root.rootRunId !== input.tree.rootOrg.orgRunId) {
    throw new Error("Runtime switch commit belongs to a different AgentOrg root.");
  }
  let matches = 0;
  const agent = <T extends AgentNode & Readonly<{ pendingRuntimeSwitch?: PendingRuntimeSwitch }>>(value: T): T => {
    if (value.agentRunId !== execution.agentRunId || value.address !== execution.memberAddress) return value;
    matches += 1;
    const result = commitRuntimeSwitchOnRecord(value, switchId, platformAgentRunId);
    if (result.kind === "conflict") throw new Error(`AgentOrg runtime switch commit does not match the persisted member (${result.reason}).`);
    return result.record;
  };
  const task = (value: TaskExecution): TaskExecution => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
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
  if (matches !== 1) throw new Error("Runtime switch commit target was not found exactly once in AgentOrg tree.");
  return validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId);
};

/** The tree's delegated copies, for the user model choice and Stop (DS-001, DS-002). */
export const agentOrgDelegatedLaunchForest = (tree: AgentOrgRunExecutionTreeSnapshot): DelegatedLaunchForest => Object.freeze({
  taskExecutionLists: taskExecutionListsOf({
    taskExecutions: tree.rootOrg.taskExecutions,
    teams: tree.rootOrg.members.filter(isConfiguredTeamExecution),
  }),
});

/** Records user model choices on the tree's copies; started values are untouched. */
export const applyAgentOrgDelegatedLaunchSelections = (
  tree: AgentOrgRunExecutionTreeSnapshot,
  selections: DelegatedLaunchSelections,
): AgentOrgRunExecutionTreeSnapshot => validateAgentOrgRunExecutionTreePayload({
  ...tree,
  rootOrg: {
    ...tree.rootOrg,
    members: tree.rootOrg.members.map((member) => isConfiguredTeamExecution(member)
      ? { ...member, taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(member.taskExecutions, selections) }
      : member),
    taskExecutions: applyDelegatedLaunchSelectionsToTaskExecutions(tree.rootOrg.taskExecutions, selections),
  },
}, tree.rootOrg.orgRunId);
