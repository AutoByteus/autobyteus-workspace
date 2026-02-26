import fs from "node:fs/promises";
import path from "node:path";
import { TeamRunManifest, TeamRunMemberBinding } from "../domain/team-models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-agent-id.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeTeamId = (teamRunId: string, options: { allowEmpty?: boolean } = {}): string => {
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
  memberAgentId: binding.memberAgentId.trim(),
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
  hostNodeId: normalizeOptionalString(binding.hostNodeId),
});

const normalizeManifest = (manifest: TeamRunManifest): TeamRunManifest => ({
  teamRunId: manifest.teamRunId.trim(),
  teamDefinitionId: manifest.teamDefinitionId.trim(),
  teamDefinitionName: manifest.teamDefinitionName.trim(),
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
    typeof payload.memberAgentId === "string" &&
    typeof payload.agentDefinitionId === "string" &&
    typeof payload.llmModelIdentifier === "string" &&
    typeof payload.autoExecuteTools === "boolean" &&
    (payload.llmConfig === null ||
      (typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig))) &&
    (typeof payload.workspaceRootPath === "string" || payload.workspaceRootPath === null) &&
    (typeof payload.hostNodeId === "string" || payload.hostNodeId === null || payload.hostNodeId === undefined)
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
    memberBindings.push(binding);
  }
  return {
    teamRunId: payload.teamRunId,
    teamDefinitionId: payload.teamDefinitionId,
    teamDefinitionName: payload.teamDefinitionName,
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
    const normalizedTeamId = normalizeTeamId(teamRunId, { allowEmpty: true });
    if (!normalizedTeamId) {
      return this.baseDir;
    }
    return path.join(this.baseDir, normalizedTeamId);
  }

  getManifestPath(teamRunId: string): string {
    return path.join(this.getTeamDirPath(teamRunId), "team_run_manifest.json");
  }

  async listTeamIds(): Promise<string[]> {
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
      const normalizedTeamId = normalizeTeamId(teamRunId);
      const raw = await fs.readFile(this.getManifestPath(normalizedTeamId), "utf-8");
      const parsed = JSON.parse(raw);
      const manifest = validateManifest(parsed);
      if (!manifest) {
        logger.warn(`Invalid team run manifest format for '${normalizedTeamId}'.`);
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
    const normalizedTeamId = normalizeTeamId(teamRunId);
    const normalized = normalizeManifest({
      ...manifest,
      teamRunId: normalizedTeamId,
    });
    const manifestPath = this.getManifestPath(normalizedTeamId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
    await fs.rename(tempPath, manifestPath);
  }
}
