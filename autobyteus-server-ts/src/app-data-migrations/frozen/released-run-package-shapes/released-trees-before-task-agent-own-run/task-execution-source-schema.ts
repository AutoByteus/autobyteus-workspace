// Frozen verbatim copy (import paths remapped only) of `src/run-history/store/task-execution-source-schema.ts` as of the
// D-10 rename commit 8bbd081c8d (behavior identical to origin/personal@66429d6f31). Owned by
// released app-data migrations and `20261017_task_agent_own_run_v1`; current runtime must not import it.

import {
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../server/agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../server/agent-collaboration/domain/collaboration-handoff.js";
import type {
  TaskAgentExecutionSource,
  TaskTeamExecutionSource,
} from "./run-execution-tree-shared-records.js";
import {
  canonicalNonRootAddress,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredArray,
  requiredString,
} from "./run-execution-tree-shared-record-schemas.js";
import { parseOptionalLaunchFields } from "./launch-configuration-source-schema.js";

/**
 * `source` of a catalog task copy is optional: its absence truthfully means the copy's source
 * is the configured placement at its address (every record written before
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
      ...parseOptionalLaunchFields(source, { source: "launchSource" }, `${label}.source`),
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
    return {
      address,
      agentDefinitionId: requiredString(member.agentDefinitionId, `${at}.members[${index}].agentDefinitionId`),
      ...parseOptionalLaunchFields(member, { launch: "launchConfiguration", source: "launchSource" }, `${at}.members[${index}]`),
    };
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
      ...parseOptionalLaunchFields(source, { source: "defaultLaunchSource" }, at),
    },
  };
};
