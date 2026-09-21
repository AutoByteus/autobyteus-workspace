import { getParentAgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../../agent-collaboration/domain/collaboration-handoff.js";
import type { ConfiguredExecutionNode } from "../../../run-history/domain/run-execution-tree-shared-records.js";
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
} from "../../../run-history/store/run-execution-tree-shared-record-schemas.js";

/** Exact migration-only decoder for the released recursive Team Run V2 predecessor. */
export type ReleasedTeamRunV2 = Readonly<{
  root: Record<string, unknown>;
  rootTeam: Record<string, unknown>;
  teamCount: number;
}>;

export const validateReleasedTeamRunV2 = (
  value: unknown,
  expectedRootTeamRunId: string,
): ReleasedTeamRunV2 => {
  const payload = exactRecord(value, "released Team Run V2");
  assertExactKeys(payload, [
    "schemaVersion",
    "createdAt",
    "archivedAt",
    "applicationBinding",
    "handoffs",
    "rootTeam",
  ], "released Team Run V2");
  if (payload.schemaVersion !== 2) throw new Error("Released Team Run V2 schemaVersion must be 2.");
  isoTimestamp(payload.createdAt, "createdAt");
  if (payload.archivedAt !== null) isoTimestamp(payload.archivedAt, "archivedAt");
  validateApplicationBinding(payload.applicationBinding);
  const handoffs = normalizeCollaborationHandoffs(payload.handoffs);

  const rootTeam = exactRecord(payload.rootTeam, "rootTeam");
  assertExactKeys(rootTeam, [
    "address",
    "teamDefinitionId",
    "teamDefinitionName",
    "teamRunId",
    "coordinatorAddress",
    "defaultLaunchConfiguration",
    "members",
    "taskExecutions",
  ], "rootTeam");
  if (rootTeam.address !== "/") throw new Error("rootTeam.address must be '/'.");
  requiredString(rootTeam.teamDefinitionId, "rootTeam.teamDefinitionId");
  requiredString(rootTeam.teamDefinitionName, "rootTeam.teamDefinitionName");
  const rootTeamRunId = requiredString(rootTeam.teamRunId, "rootTeam.teamRunId");
  if (rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Released Team Run V2 root '${rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  const coordinatorAddress = canonicalNonRootAddress(rootTeam.coordinatorAddress, "rootTeam.coordinatorAddress");
  validateLaunchConfiguration(rootTeam.defaultLaunchConfiguration, "rootTeam.defaultLaunchConfiguration");

  let teamCount = 0;
  const members = requiredArray(rootTeam.members, "rootTeam.members").map((member, index) => {
    const label = `rootTeam.members[${index}]`;
    const candidate = exactRecord(member, label);
    const validated = "agentRunId" in candidate
      ? validateConfiguredAgent(candidate, label)
      : validateConfiguredTeam(candidate, label);
    if (getParentAgentTeamAddress(validated.address) !== "/") {
      throw new Error(`Configured placement '${validated.address}' is not a direct child of '/'.`);
    }
    if (!("agentRunId" in validated)) teamCount += 1;
    return validated;
  });
  validateConfiguredPlacementUniqueness(members as readonly ConfiguredExecutionNode[]);
  if (members.filter((member) => "agentRunId" in member && member.address === coordinatorAddress).length !== 1) {
    throw new Error("rootTeam has no unique direct coordinator Agent.");
  }
  requiredArray(rootTeam.taskExecutions, "rootTeam.taskExecutions").forEach((task, index) =>
    validateTaskExecution(task, `rootTeam.taskExecutions[${index}]`));

  const cloned = structuredClone({ ...payload, handoffs }) as Record<string, unknown>;
  return Object.freeze({
    root: deepFreeze(cloned),
    rootTeam: cloned.rootTeam as Record<string, unknown>,
    teamCount,
  });
};
