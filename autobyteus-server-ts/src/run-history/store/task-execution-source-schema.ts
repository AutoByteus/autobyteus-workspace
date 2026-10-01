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

/**
 * `source` of a catalog task copy is optional: its absence truthfully means the copy's source
 * is the configured placement or collaborator at its address (every record written before
 * catalog copies existed). Present values are validated and projected exactly.
 */
export const parseTaskAgentExecutionSource = (
  execution: Record<string, unknown>,
  label: string,
): { source?: TaskAgentExecutionSource } => {
  if (execution.source === undefined) return {};
  const source = objectRecord(execution.source, `${label}.source`);
  requireKeys(source, ["kind", "agentDefinitionId", "launchConfiguration"], `${label}.source`);
  if (source.kind !== "agent") throw new Error(`${label}.source.kind must be 'agent'.`);
  return {
    source: {
      kind: "agent",
      agentDefinitionId: requiredString(source.agentDefinitionId, `${label}.source.agentDefinitionId`),
      launchConfiguration: parseLaunchConfiguration(source.launchConfiguration, `${label}.source.launchConfiguration`),
    },
  };
};

export const parseTaskTeamExecutionSource = (
  execution: Record<string, unknown>,
  teamAddress: AgentTeamAddress,
  label: string,
): { source?: TaskTeamExecutionSource } => {
  if (execution.source === undefined) return {};
  const at = `${label}.source`;
  const source = objectRecord(execution.source, at);
  requireKeys(source, [
    "kind", "teamDefinitionId", "coordinatorAddress", "members", "handoffs", "defaultLaunchConfiguration",
  ], at);
  if (source.kind !== "agent_team") throw new Error(`${at}.kind must be 'agent_team'.`);
  const members = requiredArray(source.members, `${at}.members`).map((value, index) => {
    const member = objectRecord(value, `${at}.members[${index}]`);
    requireKeys(member, ["address", "agentDefinitionId"], `${at}.members[${index}]`);
    const address = canonicalNonRootAddress(member.address, `${at}.members[${index}].address`);
    if (getParentAgentTeamAddress(address) !== teamAddress) {
      throw new Error(`${at}.members[${index}].address '${address}' is not a direct member of '${teamAddress}'.`);
    }
    return { address, agentDefinitionId: requiredString(member.agentDefinitionId, `${at}.members[${index}].agentDefinitionId`) };
  });
  const memberAddresses = new Set<string>(members.map((member) => member.address));
  if (memberAddresses.size !== members.length || members.length === 0) throw new Error(`${at}.members must be distinct and non-empty.`);
  const coordinatorAddress = canonicalNonRootAddress(source.coordinatorAddress, `${at}.coordinatorAddress`);
  if (!memberAddresses.has(coordinatorAddress)) throw new Error(`${at}.coordinatorAddress is not one of its members.`);
  const handoffs = normalizeCollaborationHandoffs(source.handoffs, `${at}.handoffs`);
  for (const handoff of handoffs) {
    if (!memberAddresses.has(handoff.from) || !memberAddresses.has(handoff.to)) {
      throw new Error(`${at} handoff '${handoff.from}' -> '${handoff.to}' leaves the Team.`);
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
    },
  };
};
