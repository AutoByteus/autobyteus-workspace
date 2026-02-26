import fs from "node:fs/promises";
import path from "node:path";
import { TeamRunManifest, TeamRunMemberBinding } from "../domain/team-models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";

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

const normalizeMemberBinding = (binding: TeamRunMemberBinding): TeamRunMemberBinding => ({
  memberRouteKey: normalizeMemberRouteKey(binding.memberRouteKey),
  memberName: binding.memberName.trim(),
  memberRunId: binding.memberRunId.trim(),
  agentDefinitionId: binding.agentDefinitionId.trim(),
  llmModelIdentifier: binding.llmModelIdentifier.trim(),
  autoExecuteTools: Boolean(binding.autoExecuteTools),
  llmConfig:
    binding.llmConfig && typeof binding.llmConfig === "object" && !Array.isArray(binding.llmConfig)
      ? { ...binding.llmConfig }
      : null,
  workspaceRootPath: binding.workspaceRootPath
    ? canonicalizeWorkspaceRootPath(binding.workspaceRootPath)
    : null,
});

const normalizeManifest = (manifest: TeamRunManifest): TeamRunManifest => ({
  teamRunId: manifest.teamRunId.trim(),
  teamDefinitionId: manifest.teamDefinitionId.trim(),
  teamDefinitionName: manifest.teamDefinitionName.trim(),
  workspaceRootPath: manifest.workspaceRootPath
    ? canonicalizeWorkspaceRootPath(manifest.workspaceRootPath)
    : null,
  coordinatorMemberRouteKey: normalizeMemberRouteKey(manifest.coordinatorMemberRouteKey),
  runVersion: Number.isFinite(manifest.runVersion) ? Math.max(1, Math.floor(manifest.runVersion)) : 1,
  createdAt: manifest.createdAt,
  updatedAt: manifest.updatedAt,
  memberBindings: manifest.memberBindings.map(normalizeMemberBinding),
});

const isMemberBindingLike = (value: unknown): value is TeamRunMemberBinding => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.memberRouteKey === "string" &&
    typeof payload.memberName === "string" &&
    typeof payload.memberRunId === "string" &&
    typeof payload.agentDefinitionId === "string" &&
    typeof payload.llmModelIdentifier === "string" &&
    typeof payload.autoExecuteTools === "boolean" &&
    (payload.llmConfig === null ||
      (typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig))) &&
    (typeof payload.workspaceRootPath === "string" || payload.workspaceRootPath === null)
  );
};

const validateManifest = (value: unknown): TeamRunManifest | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.teamRunId !== "string" ||
    typeof payload.teamDefinitionId !== "string" ||
    typeof payload.teamDefinitionName !== "string" ||
    (typeof payload.workspaceRootPath !== "string" &&
      payload.workspaceRootPath !== null &&
      payload.workspaceRootPath !== undefined) ||
    typeof payload.coordinatorMemberRouteKey !== "string" ||
    typeof payload.runVersion !== "number" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    !Array.isArray(payload.memberBindings)
  ) {
    return null;
  }
  const memberBindings: TeamRunMemberBinding[] = [];
  for (const binding of payload.memberBindings) {
    if (!isMemberBindingLike(binding)) {
      return null;
    }
    const normalizedBinding = binding as unknown as Record<string, unknown>;
    memberBindings.push({
      memberRouteKey: String(normalizedBinding.memberRouteKey),
      memberName: String(normalizedBinding.memberName),
      memberRunId: String(normalizedBinding.memberRunId),
      agentDefinitionId: String(normalizedBinding.agentDefinitionId),
      llmModelIdentifier: String(normalizedBinding.llmModelIdentifier),
      autoExecuteTools: Boolean(normalizedBinding.autoExecuteTools),
      llmConfig:
        normalizedBinding.llmConfig &&
        typeof normalizedBinding.llmConfig === "object" &&
        !Array.isArray(normalizedBinding.llmConfig)
          ? (normalizedBinding.llmConfig as Record<string, unknown>)
          : null,
      workspaceRootPath:
        typeof normalizedBinding.workspaceRootPath === "string"
          ? normalizedBinding.workspaceRootPath
          : null,
    });
  }
  return {
    teamRunId: payload.teamRunId,
    teamDefinitionId: payload.teamDefinitionId,
    teamDefinitionName: payload.teamDefinitionName,
    workspaceRootPath: payload.workspaceRootPath ?? null,
    coordinatorMemberRouteKey: payload.coordinatorMemberRouteKey,
    runVersion: payload.runVersion,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    memberBindings,
  };
};

export class TeamRunManifestStore {
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

  getManifestPath(teamRunId: string): string {
    return path.join(this.getTeamDirPath(teamRunId), "team_run_manifest.json");
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

  async readManifest(teamRunId: string): Promise<TeamRunManifest | null> {
    try {
      const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
      const raw = await fs.readFile(this.getManifestPath(normalizedTeamRunId), "utf-8");
      const parsed = JSON.parse(raw);
      const manifest = validateManifest(parsed);
      if (!manifest) {
        logger.warn(`Invalid team run manifest format for '${normalizedTeamRunId}'.`);
        return null;
      }
      return normalizeManifest(manifest);
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        logger.warn(`Failed reading team run manifest '${teamRunId}': ${String(error)}`);
      }
      return null;
    }
  }

  async writeManifest(teamRunId: string, manifest: TeamRunManifest): Promise<void> {
    const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
    const normalized = normalizeManifest({
      ...manifest,
      teamRunId: normalizedTeamRunId,
    });
    const manifestPath = this.getManifestPath(normalizedTeamRunId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    const tempPath = createTempPath(manifestPath);
    await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
    await fs.rename(tempPath, manifestPath);
  }
}
