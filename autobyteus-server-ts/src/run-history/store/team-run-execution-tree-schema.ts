import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeFile,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  objectRecord,
  parseApplicationBinding,
  parseConfiguredAgent,
  parseLaunchConfiguration,
  parseTaskExecutions,
  requiredArray,
  requiredString,
  requireKeys,
  validateTaskExecutionDelegators,
} from "./run-execution-tree-shared-record-schemas.js";

const parseRootTeam = (value: unknown): RootConfiguredTeamExecutionNode => {
  const root = objectRecord(value, "rootTeam");
  requireKeys(root, [
    "address",
    "teamDefinitionId",
    "teamDefinitionName",
    "teamRunId",
    "coordinatorAddress",
    "defaultLaunchConfiguration",
    "members",
    "taskExecutions",
  ], "rootTeam");
  if (root.address !== "/") throw new Error("rootTeam.address must be '/'.");
  const coordinatorAddress = canonicalNonRootAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  const members = requiredArray(root.members, "rootTeam.members").map((member, index) =>
    parseConfiguredAgent(member, `rootTeam.members[${index}]`));
  for (const member of members) {
    if (getParentAgentTeamAddress(member.address) !== "/") {
      throw new Error(`Configured placement '${member.address}' is not a direct Agent child of '/'.`);
    }
  }
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error("rootTeam has no unique direct coordinator Agent.");
  }
  return {
    address: "/",
    teamDefinitionId: requiredString(root.teamDefinitionId, "rootTeam.teamDefinitionId"),
    teamDefinitionName: requiredString(root.teamDefinitionName, "rootTeam.teamDefinitionName"),
    teamRunId: requiredString(root.teamRunId, "rootTeam.teamRunId"),
    coordinatorAddress,
    defaultLaunchConfiguration: parseLaunchConfiguration(root.defaultLaunchConfiguration, "rootTeam.defaultLaunchConfiguration"),
    members,
    taskExecutions: parseTaskExecutions(root.taskExecutions, "rootTeam.taskExecutions"),
  };
};

const validateInvariants = (tree: TeamRunExecutionTreeFile): void => {
  const byAddress = new Map<AgentTeamAddress, ConfiguredAgentExecutionNode>();
  const runIds = new Set<string>([tree.rootTeam.teamRunId]);
  for (const member of tree.rootTeam.members) {
    if (byAddress.has(member.address)) throw new Error(`Duplicate configured address '${member.address}'.`);
    if (runIds.has(member.agentRunId)) throw new Error(`Duplicate run ID '${member.agentRunId}'.`);
    byAddress.set(member.address, member);
    runIds.add(member.agentRunId);
  }
  for (const handoff of tree.handoffs) {
    const from = assertAgentTeamAddress(handoff.from);
    const to = assertAgentTeamAddress(handoff.to);
    if (!byAddress.has(from)) throw new Error(`Handoff sender '${from}' is not a configured Agent.`);
    if (!byAddress.has(to)) throw new Error(`Handoff recipient '${to}' is not a configured Agent.`);
  }
  validateTaskExecutionDelegators(
    tree.rootTeam.members.map((member) => member.agentRunId),
    [tree.rootTeam],
  );
};

/**
 * Reads a TeamRun execution tree tolerantly (REQ-018): known fields are required and
 * validated; `schemaVersion`, `settledAt` and any other unknown field are ignored. The
 * result holds only current fields, so writing it produces the exact current shape.
 */
export const validateTeamRunExecutionTreePayload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamRunExecutionTreeFile => {
  const payload = objectRecord(value, "TeamRun execution tree");
  requireKeys(payload, ["createdAt", "archivedAt", "applicationBinding", "handoffs", "rootTeam"], "TeamRun execution tree");
  const tree: TeamRunExecutionTreeFile = {
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    archivedAt: payload.archivedAt === null ? null : isoTimestamp(payload.archivedAt, "archivedAt"),
    applicationBinding: parseApplicationBinding(payload.applicationBinding),
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
    rootTeam: parseRootTeam(payload.rootTeam),
  };
  if (expectedRootTeamRunId && tree.rootTeam.teamRunId !== expectedRootTeamRunId) {
    throw new Error(`Execution tree root '${tree.rootTeam.teamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  validateInvariants(tree);
  return deepFreeze(tree);
};
