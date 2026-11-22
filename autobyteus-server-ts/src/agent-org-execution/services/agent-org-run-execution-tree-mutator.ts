import { commitRuntimeSwitchOnRecord } from "../../run-history/domain/runtime-selection-rule.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import type {
  CollaborationAgentBindingReplacement,
  CollaborationAgentPlatformBinding,
  CollaborationAgentRuntimeSwitchCommit,
} from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

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
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
    },
  };
  if (matches !== 1) throw new Error("Platform binding target was not found exactly once in AgentOrg tree.");
  if (!changed) return Object.freeze({ outcome: "unchanged", tree: input.tree });
  return Object.freeze({
    outcome: "adopted",
    tree: validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId),
  });
};

export const replaceAgentOrgPlatformBinding = (input: {
  tree: AgentOrgRunExecutionTreeSnapshot;
  replacement: CollaborationAgentBindingReplacement;
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
      throw new Error("AgentOrg binding replacement does not match the persisted provider binding.");
    }
    return { ...value, platformAgentRunId: input.replacement.binding.platformAgentRunId };
  };
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
    },
  };
  if (matches !== 1) throw new Error("Platform binding replacement target was not found exactly once in AgentOrg tree.");
  return validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId);
};

/**
 * autobyteus-348: the activation's commit of a switched member (direct Agents and Agents of mounted Teams), through the shared record step; a missing or ambiguous member, or a stale switch ID, throws.
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
  const configured = (value: ConfiguredExecutionNode): ConfiguredExecutionNode => "agentRunId" in value ? agent(value) : {
    ...value,
    members: value.members.map(agent),
  };
  const next = {
    ...input.tree,
    rootOrg: {
      ...input.tree.rootOrg,
      members: input.tree.rootOrg.members.map(configured),
    },
  };
  if (matches !== 1) throw new Error("Runtime switch commit target was not found exactly once in AgentOrg tree.");
  return validateAgentOrgRunExecutionTreePayload(next, input.tree.rootOrg.orgRunId);
};
