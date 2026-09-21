import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentOrgRunExecutionTreeFileV1 } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { ConfiguredExecutionNode } from "../domain/run-execution-tree-shared-records.js";
import {
  assertExactKeys,
  canonicalNonRootAddress,
  deepFreeze,
  exactRecord,
  isoTimestamp,
  requiredArray,
  requiredString,
  validateApplicationBinding,
  validateConfiguredAgent,
  validateConfiguredPlacementUniqueness,
  validateConfiguredTeam,
  validateLaunchConfiguration,
  validateTaskExecution,
} from "./run-execution-tree-shared-record-schemas.js";

const validateRootOrg = (value: unknown): ConfiguredExecutionNode[] => {
  const root = exactRecord(value, "rootOrg");
  assertExactKeys(root, [
    "address",
    "orgDefinitionId",
    "orgDefinitionName",
    "orgRunId",
    "defaultLaunchConfiguration",
    "members",
    "taskExecutions",
  ], "rootOrg");
  if (root.address !== "/") throw new Error("rootOrg.address must be '/'.");
  requiredString(root.orgDefinitionId, "rootOrg.orgDefinitionId");
  requiredString(root.orgDefinitionName, "rootOrg.orgDefinitionName");
  requiredString(root.orgRunId, "rootOrg.orgRunId");
  validateLaunchConfiguration(root.defaultLaunchConfiguration, "rootOrg.defaultLaunchConfiguration");
  const members = requiredArray(root.members, "rootOrg.members").map((member, index) => {
    const candidate = exactRecord(member, `rootOrg.members[${index}]`);
    const parsed = "agentRunId" in candidate
      ? validateConfiguredAgent(member, `rootOrg.members[${index}]`)
      : validateConfiguredTeam(member, `rootOrg.members[${index}]`);
    if (getParentAgentTeamAddress(parsed.address) !== "/") {
      throw new Error(`Configured placement '${parsed.address}' is not a direct AgentOrg member.`);
    }
    return parsed;
  });
  validateConfiguredPlacementUniqueness(members);
  requiredArray(root.taskExecutions, "rootOrg.taskExecutions").forEach((task, index) =>
    validateTaskExecution(task, `rootOrg.taskExecutions[${index}]`));
  return members;
};

const validateHandoffEndpoints = (
  tree: AgentOrgRunExecutionTreeFileV1,
  members: readonly ConfiguredExecutionNode[],
): void => {
  const agents = new Map<AgentTeamAddress, string>();
  const teams = new Map<AgentTeamAddress, AgentTeamAddress>();
  for (const member of members) {
    if ("agentRunId" in member) {
      agents.set(member.address, member.agentRunId);
      continue;
    }
    teams.set(member.address, member.coordinatorAddress);
    member.members.forEach((agent) => agents.set(agent.address, agent.agentRunId));
  }
  for (const handoff of tree.handoffs) {
    const from = assertAgentTeamAddress(handoff.from);
    const to = assertAgentTeamAddress(handoff.to);
    if (!agents.has(from)) throw new Error(`Handoff sender '${from}' is not a configured Agent.`);
    if (!agents.has(to) && !teams.has(to)) throw new Error(`Handoff recipient '${to}' is not configured.`);
    const effectiveTarget = agents.has(to) ? to : teams.get(to)!;
    if (from === effectiveTarget) throw new Error(`Handoff '${from}' -> '${to}' resolves back to its source Agent.`);
  }
};

export const validateAgentOrgRunExecutionTreePayload = (
  value: unknown,
  expectedOrgRunId?: string,
): AgentOrgRunExecutionTreeFileV1 => {
  const payload = exactRecord(value, "AgentOrgRun execution tree");
  assertExactKeys(payload, [
    "schemaVersion",
    "subjectKind",
    "createdAt",
    "archivedAt",
    "applicationBinding",
    "handoffs",
    "rootOrg",
  ], "AgentOrgRun execution tree");
  if (payload.schemaVersion !== 1) throw new Error("AgentOrgRun execution tree schemaVersion must be 1.");
  if (payload.subjectKind !== "agent_org") throw new Error("AgentOrgRun execution tree subjectKind must be 'agent_org'.");
  isoTimestamp(payload.createdAt, "createdAt");
  if (payload.archivedAt !== null) isoTimestamp(payload.archivedAt, "archivedAt");
  validateApplicationBinding(payload.applicationBinding);
  const handoffs = normalizeCollaborationHandoffs(payload.handoffs);
  const members = validateRootOrg(payload.rootOrg);
  const tree = structuredClone({ ...payload, handoffs }) as unknown as AgentOrgRunExecutionTreeFileV1;
  if (expectedOrgRunId && tree.rootOrg.orgRunId !== expectedOrgRunId) {
    throw new Error(`Execution tree root '${tree.rootOrg.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  validateHandoffEndpoints(tree, members);
  return deepFreeze(tree);
};
