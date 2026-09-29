import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  AgentOrgRunExecutionTreeFile,
  RootConfiguredAgentOrgExecutionNode,
} from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { ConfiguredExecutionNode } from "../domain/run-execution-tree-shared-records.js";
import {
  deepFreeze,
  isoTimestamp,
  objectRecord,
  parseApplicationBinding,
  parseConfiguredAgent,
  parseConfiguredTeam,
  parseLaunchConfiguration,
  parseTaskExecutions,
  requiredArray,
  requiredString,
  requireKeys,
  validateConfiguredPlacementUniqueness,
  validateTaskExecutionDelegators,
} from "./run-execution-tree-shared-record-schemas.js";

const parseRootOrg = (value: unknown): RootConfiguredAgentOrgExecutionNode => {
  const root = objectRecord(value, "rootOrg");
  requireKeys(root, [
    "address",
    "orgDefinitionId",
    "orgDefinitionName",
    "orgRunId",
    "defaultLaunchConfiguration",
    "members",
    "taskExecutions",
  ], "rootOrg");
  if (root.address !== "/") throw new Error("rootOrg.address must be '/'.");
  const members = requiredArray(root.members, "rootOrg.members").map((member, index) => {
    const label = `rootOrg.members[${index}]`;
    const parsed: ConfiguredExecutionNode = "agentRunId" in objectRecord(member, label)
      ? parseConfiguredAgent(member, label)
      : parseConfiguredTeam(member, label);
    if (getParentAgentTeamAddress(parsed.address) !== "/") {
      throw new Error(`Configured placement '${parsed.address}' is not a direct AgentOrg member.`);
    }
    return parsed;
  });
  validateConfiguredPlacementUniqueness(members);
  return {
    address: "/",
    orgDefinitionId: requiredString(root.orgDefinitionId, "rootOrg.orgDefinitionId"),
    orgDefinitionName: requiredString(root.orgDefinitionName, "rootOrg.orgDefinitionName"),
    orgRunId: requiredString(root.orgRunId, "rootOrg.orgRunId"),
    defaultLaunchConfiguration: parseLaunchConfiguration(root.defaultLaunchConfiguration, "rootOrg.defaultLaunchConfiguration"),
    members,
    taskExecutions: parseTaskExecutions(root.taskExecutions, "rootOrg.taskExecutions"),
  };
};

const validateHandoffEndpoints = (tree: AgentOrgRunExecutionTreeFile): void => {
  const members = tree.rootOrg.members;
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
  validateTaskExecutionDelegators(agents.values(), [
    tree.rootOrg,
    ...members.flatMap((member) => "teamRunId" in member ? [member] : []),
  ]);
};

/**
 * Reads an AgentOrgRun execution tree tolerantly (REQ-018); see
 * `validateTeamRunExecutionTreePayload`. The result holds only current fields.
 */
export const validateAgentOrgRunExecutionTreePayload = (
  value: unknown,
  expectedOrgRunId?: string,
): AgentOrgRunExecutionTreeFile => {
  const payload = objectRecord(value, "AgentOrgRun execution tree");
  requireKeys(payload, [
    "subjectKind",
    "createdAt",
    "archivedAt",
    "applicationBinding",
    "handoffs",
    "rootOrg",
  ], "AgentOrgRun execution tree");
  if (payload.subjectKind !== "agent_org") throw new Error("AgentOrgRun execution tree subjectKind must be 'agent_org'.");
  const tree: AgentOrgRunExecutionTreeFile = {
    subjectKind: "agent_org",
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    archivedAt: payload.archivedAt === null ? null : isoTimestamp(payload.archivedAt, "archivedAt"),
    applicationBinding: parseApplicationBinding(payload.applicationBinding),
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
    rootOrg: parseRootOrg(payload.rootOrg),
  };
  if (expectedOrgRunId && tree.rootOrg.orgRunId !== expectedOrgRunId) {
    throw new Error(`Execution tree root '${tree.rootOrg.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  validateHandoffEndpoints(tree);
  return deepFreeze(tree);
};
