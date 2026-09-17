import type { AgentOrgRunExecutionTreeFileV1 } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgMemberModelConfigIdentity } from "../domain/agent-org-member-model-config.js";
import type { RunModelSelection } from "../../llm-management/domain/run-model-selection.js";

export class AgentOrgMemberModelConfigNotFound extends Error {}

export const resolveAgentOrgMemberModelConfig = (tree: AgentOrgRunExecutionTreeFileV1, identity: AgentOrgMemberModelConfigIdentity) => {
  if (!identity.orgRunId?.trim() || !identity.memberAddress?.trim() || !identity.agentRunId?.trim()
    || tree.rootOrg.orgRunId !== identity.orgRunId) throw new AgentOrgMemberModelConfigNotFound("Invalid Org member model-config identity.");
  const nodes = tree.rootOrg.members.flatMap(member => 'agentRunId' in member ? [member] : [...member.members]);
  const node = nodes.find(member => member.address === identity.memberAddress && member.agentRunId === identity.agentRunId);
  if (!node) throw new AgentOrgMemberModelConfigNotFound("Exact configured Org Agent was not found.");
  return node;
};
export const patchAgentOrgMemberModelConfig = (tree: AgentOrgRunExecutionTreeFileV1,
  identity: AgentOrgMemberModelConfigIdentity, selection: RunModelSelection): AgentOrgRunExecutionTreeFileV1 => {
  const target = resolveAgentOrgMemberModelConfig(tree, identity);
  const patch = { ...target, launchConfiguration: { ...target.launchConfiguration,
    llmModelIdentifier: selection.llmModelIdentifier, llmConfig: structuredClone(selection.llmConfig) } };
  return { ...tree, rootOrg: { ...tree.rootOrg, members: tree.rootOrg.members.map(member =>
    'agentRunId' in member ? (member === target ? patch : member)
      : { ...member, members: member.members.map(agent => agent === target ? patch : agent) }) } };
};
