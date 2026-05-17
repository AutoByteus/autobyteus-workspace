import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type {
  TeamRunMetadata,
  TeamRunMemberMetadata,
} from "./team-run-metadata-types.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import { buildMemberRouteKeyFromPath, normalizeMemberPath } from "../../agent-team-execution/domain/team-run-member-identity.js";

export const LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE =
  "LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED";
export const LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE =
  "This team run was created by an older version and has not been upgraded. Open Settings -> Server -> Migrations for details or retry.";

export class UnsupportedLegacyTeamRunMetadataError extends Error {
  readonly code = LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE;
  readonly teamRunId: string;

  constructor(teamRunId: string) {
    super(
      `Unsupported legacy team run metadata for '${teamRunId}': flat memberMetadata/runVersion schema would lose topology.`,
    );
    this.name = "UnsupportedLegacyTeamRunMetadataError";
    this.teamRunId = teamRunId;
  }
}

export class LegacyTeamRunMetadataUpgradeRequiredError extends Error {
  readonly code = LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE;
  readonly teamRunId: string;
  readonly technicalMessage: string;

  constructor(input: { teamRunId: string; technicalMessage: string }) {
    super(LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE);
    this.name = "LegacyTeamRunMetadataUpgradeRequiredError";
    this.teamRunId = input.teamRunId;
    this.technicalMessage = input.technicalMessage;
  }
}

export const isUnsupportedLegacyTeamRunMetadataError = (
  error: unknown,
): error is UnsupportedLegacyTeamRunMetadataError =>
  error instanceof UnsupportedLegacyTeamRunMetadataError ||
  (typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "UnsupportedLegacyTeamRunMetadataError");

export const isLegacyTeamRunMetadataUpgradeRequiredError = (
  error: unknown,
): error is LegacyTeamRunMetadataUpgradeRequiredError =>
  error instanceof LegacyTeamRunMetadataUpgradeRequiredError ||
  (typeof error === "object" &&
    error !== null &&
    ((error as { name?: unknown }).name === "LegacyTeamRunMetadataUpgradeRequiredError" ||
      (error as { code?: unknown }).code === LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE));

export const toLegacyTeamRunMetadataUpgradeRequiredError = (
  error: UnsupportedLegacyTeamRunMetadataError,
): LegacyTeamRunMetadataUpgradeRequiredError =>
  new LegacyTeamRunMetadataUpgradeRequiredError({
    teamRunId: error.teamRunId,
    technicalMessage: error.message,
  });

const normalizeArchivedAt = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeApplicationExecutionContext = (
  value: ApplicationExecutionContext | null | undefined,
): ApplicationExecutionContext | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return { ...value };
};

const normalizeOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeBaseMember = <T extends TeamRunMemberMetadata>(member: T): T => {
  const memberPath = normalizeMemberPath(member.memberPath);
  return {
    ...member,
    memberName: member.memberName.trim(),
    memberPath,
    memberRouteKey: normalizeMemberRouteKey(member.memberRouteKey || buildMemberRouteKeyFromPath(memberPath)),
    memberRunId: member.memberRunId.trim(),
    role: member.role ?? null,
    description: member.description ?? null,
  };
};

const normalizeMemberMetadata = (
  memberMetadata: TeamRunMemberMetadata,
): TeamRunMemberMetadata => {
  const base = normalizeBaseMember(memberMetadata);
  if (base.memberKind === "agent_team") {
    return {
      ...base,
      teamDefinitionId: base.teamDefinitionId.trim(),
      teamRunId: normalizeOptionalString(base.teamRunId),
      coordinatorMemberRouteKey: normalizeOptionalString(base.coordinatorMemberRouteKey),
      memberTree: base.memberTree.map(normalizeMemberMetadata),
    };
  }

  return {
    ...base,
    runtimeKind: runtimeKindFromString(base.runtimeKind) ?? RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: normalizeOptionalString(base.platformAgentRunId),
    agentDefinitionId: base.agentDefinitionId.trim(),
    llmModelIdentifier: base.llmModelIdentifier.trim(),
    autoExecuteTools: Boolean(base.autoExecuteTools),
    skillAccessMode:
      base.skillAccessMode === SkillAccessMode.NONE ||
      base.skillAccessMode === SkillAccessMode.PRELOADED_ONLY ||
      base.skillAccessMode === SkillAccessMode.GLOBAL_DISCOVERY
        ? base.skillAccessMode
        : SkillAccessMode.PRELOADED_ONLY,
    llmConfig:
      base.llmConfig &&
      typeof base.llmConfig === "object" &&
      !Array.isArray(base.llmConfig)
        ? { ...base.llmConfig }
        : null,
    workspaceRootPath: base.workspaceRootPath
      ? canonicalizeWorkspaceRootPath(base.workspaceRootPath)
      : null,
    applicationExecutionContext: normalizeApplicationExecutionContext(
      base.applicationExecutionContext,
    ),
  };
};

export const normalizeTeamRunMetadata = (
  metadata: TeamRunMetadata,
): TeamRunMetadata => ({
  teamRunId: metadata.teamRunId.trim(),
  teamDefinitionId: metadata.teamDefinitionId.trim(),
  teamDefinitionName: metadata.teamDefinitionName.trim(),
  coordinatorMemberRouteKey: normalizeMemberRouteKey(metadata.coordinatorMemberRouteKey),
  createdAt: metadata.createdAt,
  updatedAt: metadata.updatedAt,
  archivedAt: normalizeArchivedAt(metadata.archivedAt),
  memberTree: metadata.memberTree.map(normalizeMemberMetadata),
});

const isApplicationExecutionContextLike = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === "object" && !Array.isArray(value));

const isAgentMemberMetadataLike = (payload: Record<string, unknown>): boolean =>
  payload.memberKind === "agent" &&
  typeof payload.memberRouteKey === "string" &&
  Array.isArray(payload.memberPath) &&
  payload.memberPath.every((entry) => typeof entry === "string") &&
  typeof payload.memberName === "string" &&
  typeof payload.memberRunId === "string" &&
  typeof payload.runtimeKind === "string" &&
  (typeof payload.platformAgentRunId === "string" || payload.platformAgentRunId === null) &&
  typeof payload.agentDefinitionId === "string" &&
  typeof payload.llmModelIdentifier === "string" &&
  typeof payload.autoExecuteTools === "boolean" &&
  Object.values(SkillAccessMode).includes(payload.skillAccessMode as SkillAccessMode) &&
  (payload.llmConfig === null || (typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig))) &&
  (typeof payload.workspaceRootPath === "string" || payload.workspaceRootPath === null) &&
  isApplicationExecutionContextLike(payload.applicationExecutionContext);

const isSubTeamMemberMetadataLike = (payload: Record<string, unknown>): boolean =>
  payload.memberKind === "agent_team" &&
  typeof payload.memberRouteKey === "string" &&
  Array.isArray(payload.memberPath) &&
  payload.memberPath.every((entry) => typeof entry === "string") &&
  typeof payload.memberName === "string" &&
  typeof payload.memberRunId === "string" &&
  typeof payload.teamDefinitionId === "string" &&
  (typeof payload.teamRunId === "string" || payload.teamRunId === null) &&
  (typeof payload.coordinatorMemberRouteKey === "string" || payload.coordinatorMemberRouteKey === null) &&
  Array.isArray(payload.memberTree);

const toMemberMetadata = (value: unknown): TeamRunMemberMetadata | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (isAgentMemberMetadataLike(payload)) {
    return {
      memberKind: "agent",
      memberRouteKey: String(payload.memberRouteKey),
      memberPath: payload.memberPath as string[],
      memberName: String(payload.memberName),
      memberRunId: String(payload.memberRunId),
      runtimeKind: runtimeKindFromString(String(payload.runtimeKind)) ?? RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: typeof payload.platformAgentRunId === "string" ? payload.platformAgentRunId : null,
      agentDefinitionId: String(payload.agentDefinitionId),
      llmModelIdentifier: String(payload.llmModelIdentifier),
      autoExecuteTools: Boolean(payload.autoExecuteTools),
      skillAccessMode: payload.skillAccessMode as SkillAccessMode,
      llmConfig: payload.llmConfig as Record<string, unknown> | null,
      workspaceRootPath: typeof payload.workspaceRootPath === "string" ? payload.workspaceRootPath : null,
      applicationExecutionContext: payload.applicationExecutionContext as ApplicationExecutionContext | null | undefined,
      role: normalizeOptionalString(payload.role),
      description: normalizeOptionalString(payload.description),
    };
  }
  if (isSubTeamMemberMetadataLike(payload)) {
    const memberTree: TeamRunMemberMetadata[] = [];
    for (const child of payload.memberTree as unknown[]) {
      const parsedChild = toMemberMetadata(child);
      if (!parsedChild) {
        return null;
      }
      memberTree.push(parsedChild);
    }
    return {
      memberKind: "agent_team",
      memberRouteKey: String(payload.memberRouteKey),
      memberPath: payload.memberPath as string[],
      memberName: String(payload.memberName),
      memberRunId: String(payload.memberRunId),
      teamDefinitionId: String(payload.teamDefinitionId),
      teamRunId: typeof payload.teamRunId === "string" ? payload.teamRunId : null,
      coordinatorMemberRouteKey: typeof payload.coordinatorMemberRouteKey === "string" ? payload.coordinatorMemberRouteKey : null,
      memberTree,
      role: normalizeOptionalString(payload.role),
      description: normalizeOptionalString(payload.description),
    };
  }
  return null;
};

export const validateTeamRunMetadataPayload = (
  value: unknown,
  teamRunId: string,
): TeamRunMetadata => {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid team run metadata format for '${teamRunId}'.`);
  }
  const payload = value as Record<string, unknown>;
  if ("memberMetadata" in payload || "runVersion" in payload) {
    throw new UnsupportedLegacyTeamRunMetadataError(teamRunId);
  }
  if (
    typeof payload.teamRunId !== "string" ||
    typeof payload.teamDefinitionId !== "string" ||
    typeof payload.teamDefinitionName !== "string" ||
    typeof payload.coordinatorMemberRouteKey !== "string" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    !Array.isArray(payload.memberTree)
  ) {
    throw new Error(`Invalid team run metadata format for '${teamRunId}'.`);
  }
  const memberTree: TeamRunMemberMetadata[] = [];
  for (const member of payload.memberTree) {
    const parsed = toMemberMetadata(member);
    if (!parsed) {
      throw new Error(`Invalid team run metadata memberTree for '${teamRunId}'.`);
    }
    memberTree.push(parsed);
  }
  return {
    teamRunId: payload.teamRunId,
    teamDefinitionId: payload.teamDefinitionId,
    teamDefinitionName: payload.teamDefinitionName,
    coordinatorMemberRouteKey: payload.coordinatorMemberRouteKey,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    archivedAt: typeof payload.archivedAt === "string" ? payload.archivedAt : null,
    memberTree,
  };
};

export const parseCurrentTeamRunMetadata = (
  value: unknown,
  teamRunId: string,
): TeamRunMetadata => normalizeTeamRunMetadata(validateTeamRunMetadataPayload(value, teamRunId));
