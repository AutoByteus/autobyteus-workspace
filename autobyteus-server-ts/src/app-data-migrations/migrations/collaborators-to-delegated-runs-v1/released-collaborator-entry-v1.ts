import { getParentAgentTeamAddress, type AgentTeamAddress } from "../../frozen/server/agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs, type CollaborationHandoff } from "../../frozen/server/agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../frozen/server/agent-collaboration/domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "../../frozen/server/agent-team-execution/domain/team-run-config.js";
import {
  canonicalNonRootAddress,
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  parseTaskExecutions,
  requireKeys,
  requiredArray,
  requiredString,
  parseOptionalLaunchFields,
  parseOptionalUserLaunchSelection,
} from "../../frozen/released-run-package-shapes/released-trees-before-task-agent-own-run.js";

/**
 * Frozen knowledge of the released `collaborators[]` entry shape (last written by the release
 * before collaborators were removed). The runtime no longer has this concept; only this migration
 * reads it. Taken verbatim from the removed `CollaboratorAgentEntry` / `CollaboratorTeamEntry` /
 * `CollaboratorTeamMember` types and their strict parser. Do not extend or reuse outside this folder.
 */
type UserLaunchSelectionV1 = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  selectedAt: string;
}>;
type RecordedMemberLaunchV1 = Readonly<{ launchConfiguration?: AgentLaunchConfiguration; launchSource?: LaunchConfigurationSource }>;

export type ReleasedCollaboratorAgentEntryV1 = Readonly<{
  kind: "agent";
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
  addedAt: string;
  addedViaAgentRunId: string;
  userLaunchSelection?: UserLaunchSelectionV1;
}>;

export type ReleasedCollaboratorTeamMemberV1 = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  userLaunchSelection?: UserLaunchSelectionV1;
}> & RecordedMemberLaunchV1;

export type ReleasedCollaboratorTeamEntryV1 = Readonly<{
  kind: "agent_team";
  address: AgentTeamAddress;
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly ReleasedCollaboratorTeamMemberV1[];
  handoffs: readonly CollaborationHandoff[];
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  defaultLaunchSource?: LaunchConfigurationSource;
  taskExecutions: readonly unknown[];
  addedAt: string;
  addedViaAgentRunId: string;
  userTeamLaunchSelection?: UserLaunchSelectionV1;
}>;

export type ReleasedCollaboratorEntryV1 = ReleasedCollaboratorAgentEntryV1 | ReleasedCollaboratorTeamEntryV1;

const rootLevelAddress = (value: unknown, label: string): AgentTeamAddress => {
  const address = canonicalNonRootAddress(value, label);
  if (getParentAgentTeamAddress(address) !== "/") throw new Error(`${label} must be a root-level address.`);
  return address;
};

const parseMember = (value: unknown, teamAddress: AgentTeamAddress, label: string): ReleasedCollaboratorTeamMemberV1 => {
  const member = objectRecord(value, label);
  requireKeys(member, ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"], label);
  const address = canonicalNonRootAddress(member.address, `${label}.address`);
  if (getParentAgentTeamAddress(address) !== teamAddress) {
    throw new Error(`${label}.address '${address}' is not a direct member of '${teamAddress}'.`);
  }
  return {
    address,
    agentDefinitionId: requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`),
    agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
    ...parseOptionalLaunchFields(member, { launch: "launchConfiguration", source: "launchSource" }, label),
    ...parseOptionalUserLaunchSelection(member, "userLaunchSelection", label),
  };
};

/** Strictly validates one released collaborator entry; throws on any deviation from the released shape. */
export const parseReleasedCollaboratorEntryV1 = (value: unknown, label: string): ReleasedCollaboratorEntryV1 => {
  const entry = objectRecord(value, label);
  if (entry.kind === "agent") {
    requireKeys(entry, [
      "kind", "address", "agentDefinitionId", "agentRunId", "platformAgentRunId", "launchConfiguration",
      "addedAt", "addedViaAgentRunId",
    ], label);
    return {
      kind: "agent",
      address: rootLevelAddress(entry.address, `${label}.address`),
      agentDefinitionId: requiredString(entry.agentDefinitionId, `${label}.agentDefinitionId`),
      agentRunId: requiredString(entry.agentRunId, `${label}.agentRunId`),
      platformAgentRunId: nullableString(entry.platformAgentRunId, `${label}.platformAgentRunId`),
      launchConfiguration: parseLaunchConfiguration(entry.launchConfiguration, `${label}.launchConfiguration`),
      ...parseOptionalLaunchFields(entry, { source: "launchSource" }, label),
      addedAt: isoTimestamp(entry.addedAt, `${label}.addedAt`),
      addedViaAgentRunId: requiredString(entry.addedViaAgentRunId, `${label}.addedViaAgentRunId`),
      ...parseOptionalUserLaunchSelection(entry, "userLaunchSelection", label),
    } as ReleasedCollaboratorAgentEntryV1;
  }
  if (entry.kind !== "agent_team") throw new Error(`${label}.kind must be 'agent' or 'agent_team'.`);
  requireKeys(entry, [
    "kind", "address", "teamDefinitionId", "teamRunId", "coordinatorAddress", "members", "handoffs",
    "defaultLaunchConfiguration", "taskExecutions", "addedAt", "addedViaAgentRunId",
  ], label);
  const address = rootLevelAddress(entry.address, `${label}.address`);
  const members = requiredArray(entry.members, `${label}.members`).map((member, index) =>
    parseMember(member, address, `${label}.members[${index}]`));
  const memberAddresses = new Set<string>(members.map((member) => member.address));
  if (memberAddresses.size !== members.length) throw new Error(`${label}.members repeat an address.`);
  const coordinatorAddress = canonicalNonRootAddress(entry.coordinatorAddress, `${label}.coordinatorAddress`);
  if (!memberAddresses.has(coordinatorAddress)) throw new Error(`${label}.coordinatorAddress is not one of its members.`);
  const handoffs = normalizeCollaborationHandoffs(entry.handoffs, `${label}.handoffs`);
  for (const handoff of handoffs) {
    if (!memberAddresses.has(handoff.from) || !memberAddresses.has(handoff.to)) {
      throw new Error(`${label} handoff '${handoff.from}' -> '${handoff.to}' leaves the Team.`);
    }
  }
  return {
    kind: "agent_team",
    address,
    teamDefinitionId: requiredString(entry.teamDefinitionId, `${label}.teamDefinitionId`),
    teamRunId: requiredString(entry.teamRunId, `${label}.teamRunId`),
    coordinatorAddress,
    members,
    handoffs,
    defaultLaunchConfiguration: parseLaunchConfiguration(entry.defaultLaunchConfiguration, `${label}.defaultLaunchConfiguration`),
    ...parseOptionalLaunchFields(entry, { source: "defaultLaunchSource" }, label),
    // Delegations a collaborator Team made use the current task-execution shape.
    taskExecutions: parseTaskExecutions(entry.taskExecutions, `${label}.taskExecutions`),
    addedAt: isoTimestamp(entry.addedAt, `${label}.addedAt`),
    addedViaAgentRunId: requiredString(entry.addedViaAgentRunId, `${label}.addedViaAgentRunId`),
    ...parseOptionalUserLaunchSelection(entry, "userTeamLaunchSelection", label),
  } as ReleasedCollaboratorTeamEntryV1;
};
