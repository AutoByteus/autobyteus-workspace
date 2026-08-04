import {
  normalizeCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  cloneTeamRunNode,
  type TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunMetadata } from "./team-run-metadata-types.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { TeamRunTreeIndex } from "../../agent-team-execution/services/team-run-tree-index.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

export const LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE =
  "LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED";
export const LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE =
  "This team run uses an obsolete metadata schema. Complete the required server data migration before starting runtime services.";

export class UnsupportedLegacyTeamRunMetadataError extends Error {
  readonly code = LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE;
  constructor(readonly teamRunId: string) {
    super(`Team run '${teamRunId}' requires migration to schemaVersion 3.`);
    this.name = "UnsupportedLegacyTeamRunMetadataError";
  }
}

export class LegacyTeamRunMetadataUpgradeRequiredError extends Error {
  readonly code = LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE;
  constructor(readonly teamRunId: string, readonly technicalMessage: string) {
    super(LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE);
    this.name = "LegacyTeamRunMetadataUpgradeRequiredError";
  }
}

export const isUnsupportedLegacyTeamRunMetadataError = (
  error: unknown,
): error is UnsupportedLegacyTeamRunMetadataError =>
  error instanceof UnsupportedLegacyTeamRunMetadataError ||
  (!!error && typeof error === "object" &&
    (error as { name?: unknown }).name === "UnsupportedLegacyTeamRunMetadataError");

export const isLegacyTeamRunMetadataUpgradeRequiredError = (
  error: unknown,
): error is LegacyTeamRunMetadataUpgradeRequiredError =>
  error instanceof LegacyTeamRunMetadataUpgradeRequiredError ||
  (!!error && typeof error === "object" &&
    (error as { code?: unknown }).code === LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE);

export const toLegacyTeamRunMetadataUpgradeRequiredError = (
  error: UnsupportedLegacyTeamRunMetadataError,
): LegacyTeamRunMetadataUpgradeRequiredError =>
  new LegacyTeamRunMetadataUpgradeRequiredError(error.teamRunId, error.message);

const required = (value: unknown, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], label: string): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const validateNullableString = (value: unknown, label: string): void => {
  if (value !== null && typeof value !== "string") throw new Error(`${label} must be a string or null.`);
};

const validateNodeShape = (value: unknown, label: string, isRoot = false): void => {
  const node = record(value, label);
  if (node.kind === "agent") {
    exactKeys(node, [
      "kind", "address", "agentDefinitionId", "agentRunId", "platformAgentRunId",
      "role", "description", "runtimeKind", "llmModelIdentifier", "llmConfig",
      "autoExecuteTools", "skillAccessMode", "workspaceRootPath", "applicationExecutionContext",
    ], label);
    required(node.address, `${label}.address`);
    required(node.agentDefinitionId, `${label}.agentDefinitionId`);
    required(node.agentRunId, `${label}.agentRunId`);
    validateNullableString(node.platformAgentRunId, `${label}.platformAgentRunId`);
    validateNullableString(node.role, `${label}.role`);
    validateNullableString(node.description, `${label}.description`);
    if (!Object.values(RuntimeKind).includes(node.runtimeKind as RuntimeKind)) {
      throw new Error(`${label}.runtimeKind is unsupported.`);
    }
    required(node.llmModelIdentifier, `${label}.llmModelIdentifier`);
    if (node.llmConfig !== null && (!node.llmConfig || typeof node.llmConfig !== "object" || Array.isArray(node.llmConfig))) {
      throw new Error(`${label}.llmConfig must be an object or null.`);
    }
    if (typeof node.autoExecuteTools !== "boolean") throw new Error(`${label}.autoExecuteTools must be boolean.`);
    if (!Object.values(SkillAccessMode).includes(node.skillAccessMode as SkillAccessMode)) {
      throw new Error(`${label}.skillAccessMode is unsupported.`);
    }
    validateNullableString(node.workspaceRootPath, `${label}.workspaceRootPath`);
    if (node.applicationExecutionContext !== null && (!node.applicationExecutionContext || typeof node.applicationExecutionContext !== "object" || Array.isArray(node.applicationExecutionContext))) {
      throw new Error(`${label}.applicationExecutionContext must be an object or null.`);
    }
    return;
  }
  if (node.kind !== "agent_team") throw new Error(`${label}.kind is unsupported.`);
  exactKeys(node, isRoot
    ? ["kind", "address", "teamDefinitionId", "teamRunId", "coordinatorAddress", "children"]
    : [
        "kind", "address", "teamDefinitionId", "teamRunId", "coordinatorAddress",
        "role", "description", "children",
      ], label);
  required(node.address, `${label}.address`);
  required(node.teamDefinitionId, `${label}.teamDefinitionId`);
  required(node.teamRunId, `${label}.teamRunId`);
  required(node.coordinatorAddress, `${label}.coordinatorAddress`);
  if (!isRoot) {
    validateNullableString(node.role, `${label}.role`);
    validateNullableString(node.description, `${label}.description`);
  }
  if (!Array.isArray(node.children)) throw new Error(`${label}.children must be an array.`);
  node.children.forEach((child, index) => validateNodeShape(child, `${label}.children[${index}]`));
};

const validateHandoffTopology = (
  rootTeam: TeamRunAgentTeamNode,
  handoffs: readonly CollaborationHandoff[],
): void => {
  const index = new TeamRunTreeIndex(rootTeam);
  const seen = new Set<string>();
  for (const [position, handoff] of handoffs.entries()) {
    const from = assertAgentTeamAddress(handoff.from);
    const to = assertAgentTeamAddress(handoff.to);
    if (!index.getAgent(from)) throw new Error(`handoffs[${position}].from must resolve to an Agent.`);
    if (!index.getNode(to)) throw new Error(`handoffs[${position}].to must resolve to an Agent or AgentTeam.`);
    const key = `${from}\u0000${to}`;
    if (seen.has(key)) throw new Error(`Duplicate handoff '${from}' -> '${to}'.`);
    seen.add(key);
  }
};

export const normalizeTeamRunMetadata = (metadata: TeamRunMetadata): TeamRunMetadata => {
  const rootTeam = cloneTeamRunNode(metadata.rootTeam) as TeamRunAgentTeamNode;
  if (rootTeam.address !== "/") throw new Error("TeamRun metadata rootTeam address must be '/'.");
  const handoffs = Object.freeze(normalizeCollaborationHandoffs(metadata.handoffs));
  validateHandoffTopology(rootTeam, handoffs);
  return Object.freeze({
    schemaVersion: 3 as const,
    teamDefinitionName: required(metadata.teamDefinitionName, "teamDefinitionName"),
    createdAt: required(metadata.createdAt, "createdAt"),
    archivedAt: typeof metadata.archivedAt === "string" && metadata.archivedAt.trim()
      ? metadata.archivedAt.trim()
      : null,
    rootTeam,
    handoffs,
  });
};

export const validateTeamRunMetadataPayload = (
  value: unknown,
  teamRunId: string,
): TeamRunMetadata => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid team run metadata format for '${teamRunId}'.`);
  }
  const payload = value as Record<string, unknown>;
  if (payload.schemaVersion !== 3) throw new UnsupportedLegacyTeamRunMetadataError(teamRunId);
  exactKeys(payload, ["schemaVersion", "teamDefinitionName", "createdAt", "archivedAt", "rootTeam", "handoffs"], "TeamRun metadata");
  validateNodeShape(payload.rootTeam, "TeamRun metadata.rootTeam", true);
  const rootTeam = cloneTeamRunNode(payload.rootTeam as TeamRunAgentTeamNode) as TeamRunAgentTeamNode;
  if (rootTeam.teamRunId !== teamRunId) {
    throw new Error(`TeamRun metadata root teamRunId '${rootTeam.teamRunId}' does not match directory '${teamRunId}'.`);
  }
  if (!Array.isArray(payload.handoffs)) throw new Error("TeamRun metadata handoffs must be an array.");
  const handoffs = normalizeCollaborationHandoffs(payload.handoffs);
  validateHandoffTopology(rootTeam, handoffs);
  return normalizeTeamRunMetadata({
    schemaVersion: 3,
    teamDefinitionName: required(payload.teamDefinitionName, "teamDefinitionName"),
    createdAt: required(payload.createdAt, "createdAt"),
    archivedAt: typeof payload.archivedAt === "string" ? payload.archivedAt : null,
    rootTeam,
    handoffs,
  });
};

export const parseCurrentTeamRunMetadata = validateTeamRunMetadataPayload;
