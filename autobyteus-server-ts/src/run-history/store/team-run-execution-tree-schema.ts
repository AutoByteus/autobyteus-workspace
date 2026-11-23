import {
  assertAgentTeamAddress,
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { normalizeCollaborationHandoffs } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  ConfiguredAgentExecutionNode,
  FormerMemberExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunCopiedFrom,
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
  requiredArray,
  requiredString,
  requireKeys,
} from "./run-execution-tree-shared-record-schemas.js";
import { parseContainedIn } from "./contained-in-schema.js";
import { parseDelegatedFrom } from "./delegated-from-schema.js";
import { parseOptionalLaunchFields } from "./launch-configuration-source-schema.js";

/** A former member, with its optional `leaving` marker (only `true` is written; absent means stopped). */
const parseFormerMember = (value: unknown, field: string): FormerMemberExecutionNode => {
  const { leaving, ...member } = objectRecord(value, field);
  if (leaving !== undefined && leaving !== true) throw new Error(`${field}.leaving must be true when present.`);
  return { ...parseConfiguredAgent(member, field), ...(leaving === true ? { leaving: true as const } : {}) };
};

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
  ], "rootTeam");
  if (root.address !== "/") throw new Error("rootTeam.address must be '/'.");
  const coordinatorAddress = canonicalNonRootAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  const members = requiredArray(root.members, "rootTeam.members").map((member, index) =>
    parseConfiguredAgent(member, `rootTeam.members[${index}]`));
  const formerMembers = root.formerMembers === undefined ? [] : requiredArray(root.formerMembers, "rootTeam.formerMembers")
    .map((member, index) => parseFormerMember(member, `rootTeam.formerMembers[${index}]`));
  for (const member of [...members, ...formerMembers]) {
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
    ...parseOptionalLaunchFields(root, { source: "defaultLaunchSource" }, "rootTeam"),
    members,
    ...(formerMembers.length ? { formerMembers } : {}),
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
  // A former member may share its address with a current member (another agent took its place), never a run ID.
  for (const member of tree.rootTeam.formerMembers ?? []) {
    if (runIds.has(member.agentRunId)) throw new Error(`Duplicate run ID '${member.agentRunId}'.`);
    runIds.add(member.agentRunId);
  }
  for (const handoff of tree.handoffs) {
    const from = assertAgentTeamAddress(handoff.from);
    assertAgentTeamAddress(handoff.to);
    if (!byAddress.has(from)) throw new Error(`Handoff sender '${from}' is not a configured Agent.`);
    // A `to` outside the team (TC-12: a delegated team copied from an org hands off to `/Teacher`) is an external
    // target, kept as stored and resolved when sent (contract §2.3).
  }
};

const parseCopiedFrom = (value: unknown): TeamRunCopiedFrom => {
  if (value === "team_definition" || value === "configured_placement") return value;
  throw new Error("copiedFrom must be 'team_definition' or 'configured_placement'.");
};

/**
 * Reads a TeamRun execution tree tolerantly (REQ-018): known fields are required and
 * validated; `schemaVersion`, `settledAt` and any other unknown field are ignored (the `taskExecutions` lists are
 * gone since autobyteus-461, E9: the Task entries hold who delegated to whom). The
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
    // A Team run a peer node started (autobyteus-247); absent otherwise. A malformed section makes the tree
    // unreadable, as for a standalone run's `run_metadata.json`.
    ...(payload.delegatedFrom === undefined ? {} : { delegatedFrom: parseDelegatedFrom(payload.delegatedFrom) }),
    ...(payload.copiedFrom === undefined ? {} : { copiedFrom: parseCopiedFrom(payload.copiedFrom) }),
    ...(payload.containedIn === undefined ? {} : { containedIn: parseContainedIn(payload.containedIn) }),
  };
  // A Team unit of an Org (contract §3) is not a delegated run: it has neither `delegatedFrom` nor `copiedFrom`.
  if (tree.containedIn && (tree.delegatedFrom || tree.copiedFrom)) throw new Error("A Team run contained in an Org is not a delegated run.");
  if (expectedRootTeamRunId && tree.rootTeam.teamRunId !== expectedRootTeamRunId) {
    throw new Error(`Execution tree root '${tree.rootTeam.teamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  validateInvariants(tree);
  return deepFreeze(tree);
};
