import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  TaskAgentTeamMemberNode,
  TaskAgentTeamRootNode,
  TaskAgentTeamTreeFile,
} from "../../agent-team-execution/domain/task-agent-team-tree.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredArray,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";
import { parseOptionalLaunchFields, parseOptionalUserLaunchSelection } from "./launch-configuration-source-schema.js";
import { parseTaskAgentSection } from "./task-agent-own-file-schema.js";

const parseMember = (value: unknown, label: string): TaskAgentTeamMemberNode => {
  const member = objectRecord(value, label);
  requireKeys(member, ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"], label);
  return {
    address: canonicalNonRootAddress(member.address, `${label}.address`),
    agentDefinitionId: requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`),
    agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
    role: null,
    description: null,
    ...parseOptionalLaunchFields(member, { launch: "launchConfiguration", source: "launchSource" }, label),
    ...parseOptionalUserLaunchSelection(member, "userLaunchSelection", label),
  };
};

const parseRootTeam = (value: unknown): TaskAgentTeamRootNode => {
  const root = objectRecord(value, "rootTeam");
  requireKeys(root, [
    "address", "teamDefinitionId", "teamRunId", "coordinatorAddress", "defaultLaunchConfiguration", "members",
  ], "rootTeam");
  if (root.taskExecutions !== undefined && requiredArray(root.taskExecutions, "rootTeam.taskExecutions").length > 0) {
    throw new Error("A task agent team's own tree holds no task executions.");
  }
  const members = requiredArray(root.members, "rootTeam.members").map((member, index) =>
    parseMember(member, `rootTeam.members[${index}]`));
  const coordinatorAddress = canonicalNonRootAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error("rootTeam has no unique coordinator member.");
  }
  const runIds = new Set<string>();
  for (const member of members) {
    if (runIds.has(member.agentRunId)) throw new Error(`Duplicate member run ID '${member.agentRunId}'.`);
    runIds.add(member.agentRunId);
  }
  return {
    address: canonicalNonRootAddress(root.address, "rootTeam.address"),
    teamDefinitionId: requiredString(root.teamDefinitionId, "rootTeam.teamDefinitionId"),
    teamRunId: requiredString(root.teamRunId, "rootTeam.teamRunId"),
    coordinatorAddress,
    defaultLaunchConfiguration: parseLaunchConfiguration(root.defaultLaunchConfiguration, "rootTeam.defaultLaunchConfiguration"),
    members,
    taskExecutions: [],
  };
};

/** A task agent team's own tree (contract §3.2); `expectedTeamRunId` is the folder's run id. */
export const validateTaskAgentTeamTreePayload = (value: unknown, expectedTeamRunId: string): TaskAgentTeamTreeFile => {
  const payload = objectRecord(value, "Task agent team tree");
  requireKeys(payload, ["createdAt", "handoffs", "rootTeam", "taskAgent"], "Task agent team tree");
  const tree: TaskAgentTeamTreeFile = {
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    archivedAt: null,
    applicationBinding: null,
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
    rootTeam: parseRootTeam(payload.rootTeam),
    taskAgent: parseTaskAgentSection(payload.taskAgent),
  };
  if (tree.rootTeam.teamRunId !== expectedTeamRunId) {
    throw new Error(`Task agent team tree '${tree.rootTeam.teamRunId}' does not match '${expectedTeamRunId}'.`);
  }
  if (tree.taskAgent.address !== tree.rootTeam.address) {
    throw new Error("A task agent team's address and its taskAgent address differ.");
  }
  return deepFreeze(tree);
};
