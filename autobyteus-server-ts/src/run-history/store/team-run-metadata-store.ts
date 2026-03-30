import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  TeamRunMetadata,
  TeamRunMemberMetadata,
} from "./team-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const normalizeTeamRunId = (teamRunId: string, options: { allowEmpty?: boolean } = {}): string => {
  const normalized = teamRunId.trim();
  if (normalized.length === 0) {
    if (options.allowEmpty) {
      return "";
    }
    throw new Error("teamRunId cannot be empty.");
  }
  return normalized;
};

const normalizeMemberMetadata = (
  memberMetadata: TeamRunMemberMetadata,
): TeamRunMemberMetadata => ({
  memberRouteKey: normalizeMemberRouteKey(memberMetadata.memberRouteKey),
  memberName: memberMetadata.memberName.trim(),
  memberRunId: memberMetadata.memberRunId.trim(),
  runtimeKind: runtimeKindFromString(memberMetadata.runtimeKind) ?? RuntimeKind.AUTOBYTEUS,
  platformAgentRunId:
    typeof memberMetadata.platformAgentRunId === "string" &&
    memberMetadata.platformAgentRunId.trim().length > 0
      ? memberMetadata.platformAgentRunId.trim()
      : null,
  agentDefinitionId: memberMetadata.agentDefinitionId.trim(),
  llmModelIdentifier: memberMetadata.llmModelIdentifier.trim(),
  autoExecuteTools: Boolean(memberMetadata.autoExecuteTools),
  skillAccessMode:
    memberMetadata.skillAccessMode === SkillAccessMode.NONE ||
    memberMetadata.skillAccessMode === SkillAccessMode.PRELOADED_ONLY ||
    memberMetadata.skillAccessMode === SkillAccessMode.GLOBAL_DISCOVERY
      ? memberMetadata.skillAccessMode
      : SkillAccessMode.PRELOADED_ONLY,
  llmConfig:
    memberMetadata.llmConfig &&
    typeof memberMetadata.llmConfig === "object" &&
    !Array.isArray(memberMetadata.llmConfig)
      ? { ...memberMetadata.llmConfig }
      : null,
  workspaceRootPath: memberMetadata.workspaceRootPath
    ? canonicalizeWorkspaceRootPath(memberMetadata.workspaceRootPath)
    : null,
});

const normalizeMetadata = (
  metadata: TeamRunMetadata,
): TeamRunMetadata => ({
  teamRunId: metadata.teamRunId.trim(),
  teamDefinitionId: metadata.teamDefinitionId.trim(),
  teamDefinitionName: metadata.teamDefinitionName.trim(),
  coordinatorMemberRouteKey: normalizeMemberRouteKey(metadata.coordinatorMemberRouteKey),
  runVersion: Number.isFinite(metadata.runVersion) ? Math.max(1, Math.floor(metadata.runVersion)) : 1,
  createdAt: metadata.createdAt,
  updatedAt: metadata.updatedAt,
  memberMetadata: metadata.memberMetadata.map(normalizeMemberMetadata),
});

const isMemberMetadataLike = (
  value: unknown,
): value is TeamRunMemberMetadata => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.memberRouteKey === "string" &&
    typeof payload.memberName === "string" &&
    typeof payload.memberRunId === "string" &&
    typeof payload.runtimeKind === "string" &&
    (typeof payload.platformAgentRunId === "string" || payload.platformAgentRunId === null) &&
    typeof payload.agentDefinitionId === "string" &&
    typeof payload.llmModelIdentifier === "string" &&
    typeof payload.autoExecuteTools === "boolean" &&
    (payload.skillAccessMode === SkillAccessMode.NONE ||
      payload.skillAccessMode === SkillAccessMode.PRELOADED_ONLY ||
      payload.skillAccessMode === SkillAccessMode.GLOBAL_DISCOVERY) &&
    (payload.llmConfig === null ||
      (typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig))) &&
    (typeof payload.workspaceRootPath === "string" || payload.workspaceRootPath === null)
  );
};

const validateMetadata = (value: unknown): TeamRunMetadata | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.teamRunId !== "string" ||
    typeof payload.teamDefinitionId !== "string" ||
    typeof payload.teamDefinitionName !== "string" ||
    typeof payload.coordinatorMemberRouteKey !== "string" ||
    typeof payload.runVersion !== "number" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    !Array.isArray(payload.memberMetadata)
  ) {
    return null;
  }
  const memberMetadata: TeamRunMemberMetadata[] = [];
  for (const member of payload.memberMetadata) {
    if (!isMemberMetadataLike(member)) {
      return null;
    }
    const normalizedMember = member as unknown as Record<string, unknown>;
    memberMetadata.push({
      memberRouteKey: String(normalizedMember.memberRouteKey),
      memberName: String(normalizedMember.memberName),
      memberRunId: String(normalizedMember.memberRunId),
      runtimeKind:
        runtimeKindFromString(String(normalizedMember.runtimeKind)) ?? RuntimeKind.AUTOBYTEUS,
      platformAgentRunId:
        typeof normalizedMember.platformAgentRunId === "string"
          ? normalizedMember.platformAgentRunId
          : null,
      agentDefinitionId: String(normalizedMember.agentDefinitionId),
      llmModelIdentifier: String(normalizedMember.llmModelIdentifier),
      autoExecuteTools: Boolean(normalizedMember.autoExecuteTools),
      skillAccessMode:
        normalizedMember.skillAccessMode === SkillAccessMode.NONE ||
        normalizedMember.skillAccessMode === SkillAccessMode.PRELOADED_ONLY ||
        normalizedMember.skillAccessMode === SkillAccessMode.GLOBAL_DISCOVERY
          ? normalizedMember.skillAccessMode
          : SkillAccessMode.PRELOADED_ONLY,
      llmConfig:
        normalizedMember.llmConfig &&
        typeof normalizedMember.llmConfig === "object" &&
        !Array.isArray(normalizedMember.llmConfig)
          ? (normalizedMember.llmConfig as Record<string, unknown>)
          : null,
      workspaceRootPath:
        typeof normalizedMember.workspaceRootPath === "string"
          ? normalizedMember.workspaceRootPath
          : null,
    });
  }
  return {
    teamRunId: payload.teamRunId,
    teamDefinitionId: payload.teamDefinitionId,
    teamDefinitionName: payload.teamDefinitionName,
    coordinatorMemberRouteKey: payload.coordinatorMemberRouteKey,
    runVersion: payload.runVersion,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    memberMetadata,
  };
};

export class TeamRunMetadataStore {
  private readonly baseDir: string;

  constructor(memoryDir: string) {
    this.baseDir = path.join(memoryDir, "agent_teams");
  }

  getTeamDirPath(teamRunId: string): string {
    const normalizedTeamRunId = normalizeTeamRunId(teamRunId, { allowEmpty: true });
    if (!normalizedTeamRunId) {
      return this.baseDir;
    }
    return path.join(this.baseDir, normalizedTeamRunId);
  }

  getMetadataPath(teamRunId: string): string {
    return path.join(this.getTeamDirPath(teamRunId), "team_run_metadata.json");
  }

  async listTeamRunIds(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed listing team run directories: ${String(error)}`);
      }
      return [];
    }
  }

  async readMetadata(teamRunId: string): Promise<TeamRunMetadata | null> {
    try {
      const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
      const raw = await fs.readFile(this.getMetadataPath(normalizedTeamRunId), "utf-8");
      const parsed = JSON.parse(raw);
      const metadata = validateMetadata(parsed);
      if (!metadata) {
        logger.warn(`Invalid team run metadata format for '${normalizedTeamRunId}'.`);
        return null;
      }
      return normalizeMetadata(metadata);
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed reading team run metadata '${teamRunId}': ${String(error)}`);
      }
      return null;
    }
  }

  async writeMetadata(teamRunId: string, metadata: TeamRunMetadata): Promise<void> {
    const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
    const normalized = normalizeMetadata({
      ...metadata,
      teamRunId: normalizedTeamRunId,
    });
    const metadataPath = this.getMetadataPath(normalizedTeamRunId);
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    const tempPath = createTempPath(metadataPath);
    await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
    await fs.rename(tempPath, metadataPath);
  }
}
