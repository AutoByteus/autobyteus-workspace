import {
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  TaskAgentExecutionSource,
  TaskTeamExecutionSource,
} from "../domain/run-execution-tree-shared-records.js";
import {
  canonicalNonRootAddress,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredArray,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";
import { parseOptionalLaunchFields } from "./launch-configuration-source-schema.js";

/** `source` of a delegated copy: the snapshot it runs with, validated and projected exactly. */
export const parseTaskAgentExecutionSource = (
  execution: Record<string, unknown>,
  label: string,
): { source: TaskAgentExecutionSource } => {
  const source = objectRecord(execution.source, `${label}.source`);
  requireKeys(source, ["kind", "agentDefinitionId", "launchConfiguration"], `${label}.source`);
  if (source.kind !== "agent") throw new Error(`${label}.source.kind must be 'agent'.`);
  return {
    source: {
      kind: "agent",
      agentDefinitionId: requiredString(source.agentDefinitionId, `${label}.source.agentDefinitionId`),
      launchConfiguration: parseLaunchConfiguration(source.launchConfiguration, `${label}.source.launchConfiguration`),
      ...parseOptionalLaunchFields(source, { source: "launchSource" }, `${label}.source`),
    },
  };
};

export const parseTaskTeamExecutionSource = (
  execution: Record<string, unknown>,
  teamAddress: AgentTeamAddress,
  label: string,
): { source: TaskTeamExecutionSource } => {
  const at = `${label}.source`;
  const source = objectRecord(execution.source, at);
  requireKeys(source, [
    "kind", "teamDefinitionId", "coordinatorAddress", "members", "handoffs", "defaultLaunchConfiguration",
  ], at);
  if (source.kind !== "agent_team") throw new Error(`${at}.kind must be 'agent_team'.`);
  const members = requiredArray(source.members, `${at}.members`).map((value, index) => {
    const memberAt = `${at}.members[${index}]`;
    const member = objectRecord(value, memberAt);
    requireKeys(member, ["address", "agentDefinitionId", "launchConfiguration", "followsTeam"], memberAt);
    const address = canonicalNonRootAddress(member.address, `${memberAt}.address`);
    if (getParentAgentTeamAddress(address) !== teamAddress) {
      throw new Error(`${memberAt}.address '${address}' is not a direct member of '${teamAddress}'.`);
    }
    if (typeof member.followsTeam !== "boolean") throw new Error(`${memberAt}.followsTeam must be boolean.`);
    return {
      address,
      agentDefinitionId: requiredString(member.agentDefinitionId, `${memberAt}.agentDefinitionId`),
      launchConfiguration: parseLaunchConfiguration(member.launchConfiguration, `${memberAt}.launchConfiguration`),
      followsTeam: member.followsTeam,
      ...parseOptionalLaunchFields(member, { source: "launchSource" }, memberAt),
    };
  });
  const memberAddresses = new Set<string>(members.map((member) => member.address));
  if (memberAddresses.size !== members.length || members.length === 0) throw new Error(`${at}.members must be distinct and non-empty.`);
  const coordinatorAddress = canonicalNonRootAddress(source.coordinatorAddress, `${at}.coordinatorAddress`);
  if (!memberAddresses.has(coordinatorAddress)) throw new Error(`${at}.coordinatorAddress is not one of its members.`);
  const handoffs = normalizeCollaborationHandoffs(source.handoffs, `${at}.handoffs`);
  // The handoff rules of its members: each starts at a member; it may lead to the coordinating run (D-4).
  for (const handoff of handoffs) {
    if (!memberAddresses.has(handoff.from)) {
      throw new Error(`${at} handoff '${handoff.from}' -> '${handoff.to}' does not start at a member of the Team.`);
    }
  }
  return {
    source: {
      kind: "agent_team",
      teamDefinitionId: requiredString(source.teamDefinitionId, `${at}.teamDefinitionId`),
      coordinatorAddress,
      members,
      handoffs,
      defaultLaunchConfiguration: parseLaunchConfiguration(source.defaultLaunchConfiguration, `${at}.defaultLaunchConfiguration`),
      ...parseOptionalLaunchFields(source, { source: "defaultLaunchSource" }, at),
    },
  };
};
