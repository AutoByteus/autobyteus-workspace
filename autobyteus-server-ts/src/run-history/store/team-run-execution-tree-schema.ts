import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  ConfiguredAgentExecutionNode,
  TeamRunExecutionTreeFileV2,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
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
  validateTaskExecution,
  validateLaunchConfiguration,
} from "./run-execution-tree-shared-record-schemas.js";

const validateRootTeam = (value: unknown): void => {
  const root = exactRecord(value, "rootTeam");
  assertExactKeys(root, [
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
  requiredString(root.teamDefinitionId, "rootTeam.teamDefinitionId");
  requiredString(root.teamDefinitionName, "rootTeam.teamDefinitionName");
  requiredString(root.teamRunId, "rootTeam.teamRunId");
  const coordinatorAddress = canonicalNonRootAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  validateLaunchConfiguration(root.defaultLaunchConfiguration, "rootTeam.defaultLaunchConfiguration");
  const members = requiredArray(root.members, "rootTeam.members").map((member, index) =>
    validateConfiguredAgent(member, `rootTeam.members[${index}]`));
  for (const member of members) {
    if (getParentAgentTeamAddress(member.address) !== "/") {
      throw new Error(`Configured placement '${member.address}' is not a direct Agent child of '/'.`);
    }
  }
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error("rootTeam has no unique direct coordinator Agent.");
  }
  requiredArray(root.taskExecutions, "rootTeam.taskExecutions").forEach((task, index) =>
    validateTaskExecution(task, `rootTeam.taskExecutions[${index}]`));
};

const validateInvariants = (tree: TeamRunExecutionTreeFileV2): void => {
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
};

export const validateTeamRunExecutionTreePayload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamRunExecutionTreeFileV2 => {
  const payload = exactRecord(value, "TeamRun execution tree");
  assertExactKeys(payload, [
    "schemaVersion",
    "createdAt",
    "archivedAt",
    "applicationBinding",
    "handoffs",
    "rootTeam",
  ], "TeamRun execution tree");
  if (payload.schemaVersion !== 2) throw new Error("TeamRun execution tree schemaVersion must be 2.");
  isoTimestamp(payload.createdAt, "createdAt");
  if (payload.archivedAt !== null) isoTimestamp(payload.archivedAt, "archivedAt");
  validateApplicationBinding(payload.applicationBinding);
  const handoffs = normalizeCollaborationHandoffs(payload.handoffs);
  validateRootTeam(payload.rootTeam);
  const cloned = structuredClone({ ...payload, handoffs }) as unknown as TeamRunExecutionTreeFileV2;
  if (expectedRootTeamRunId && cloned.rootTeam.teamRunId !== expectedRootTeamRunId) {
    throw new Error(`Execution tree root '${cloned.rootTeam.teamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  validateInvariants(cloned);
  return deepFreeze(cloned);
};
