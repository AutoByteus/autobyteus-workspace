import fs from "node:fs/promises";
import path from "node:path";
import { TeamMemberRunManifest, TeamRunKnownStatus } from "../domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "./team-member-memory-layout-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeKnownStatus = (value: unknown): TeamRunKnownStatus => {
  if (value === "ACTIVE" || value === "IDLE" || value === "ERROR") {
    return value;
  }
  return "IDLE";
};

const normalizeManifest = (manifest: TeamMemberRunManifest): TeamMemberRunManifest => ({
  version: Number.isFinite(manifest.version) ? Math.max(1, Math.floor(manifest.version)) : 1,
  teamRunId: normalizeRequiredString(manifest.teamRunId, "teamRunId"),
  runVersion: Number.isFinite(manifest.runVersion) ? Math.max(1, Math.floor(manifest.runVersion)) : 1,
  memberRouteKey: normalizeMemberRouteKey(manifest.memberRouteKey),
  memberName: normalizeRequiredString(manifest.memberName, "memberName"),
  memberRunId: normalizeRequiredString(manifest.memberRunId, "memberRunId"),
  agentDefinitionId: normalizeRequiredString(manifest.agentDefinitionId, "agentDefinitionId"),
  llmModelIdentifier: normalizeRequiredString(manifest.llmModelIdentifier, "llmModelIdentifier"),
  autoExecuteTools: Boolean(manifest.autoExecuteTools),
  llmConfig:
    manifest.llmConfig && typeof manifest.llmConfig === "object" && !Array.isArray(manifest.llmConfig)
      ? { ...manifest.llmConfig }
      : null,
  workspaceRootPath: manifest.workspaceRootPath
    ? canonicalizeWorkspaceRootPath(manifest.workspaceRootPath)
    : null,
  lastKnownStatus: normalizeKnownStatus(manifest.lastKnownStatus),
  createdAt: normalizeRequiredString(manifest.createdAt, "createdAt"),
  updatedAt: normalizeRequiredString(manifest.updatedAt, "updatedAt"),
});

const validateManifest = (value: unknown): TeamMemberRunManifest | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.version !== "number" ||
    typeof payload.teamRunId !== "string" ||
    typeof payload.runVersion !== "number" ||
    typeof payload.memberRouteKey !== "string" ||
    typeof payload.memberName !== "string" ||
    typeof payload.memberRunId !== "string" ||
    typeof payload.agentDefinitionId !== "string" ||
    typeof payload.llmModelIdentifier !== "string" ||
    typeof payload.autoExecuteTools !== "boolean" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string"
  ) {
    return null;
  }

  const llmConfig =
    payload.llmConfig && typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig)
      ? (payload.llmConfig as Record<string, unknown>)
      : null;

  return {
    version: payload.version,
    teamRunId: payload.teamRunId,
    runVersion: payload.runVersion,
    memberRouteKey: payload.memberRouteKey,
    memberName: payload.memberName,
    memberRunId: payload.memberRunId,
    agentDefinitionId: payload.agentDefinitionId,
    llmModelIdentifier: payload.llmModelIdentifier,
    autoExecuteTools: payload.autoExecuteTools,
    llmConfig,
    workspaceRootPath: normalizeOptionalString(payload.workspaceRootPath),
    lastKnownStatus: normalizeKnownStatus(payload.lastKnownStatus),
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
};

export class TeamMemberRunManifestStore {
  private readonly layoutStore: TeamMemberMemoryLayoutStore;

  constructor(memoryDir: string) {
    this.layoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
  }

  getManifestPath(teamRunId: string, memberRunId: string): string {
    return path.join(this.layoutStore.getMemberDirPath(teamRunId, memberRunId), "run_manifest.json");
  }

  async writeManifest(teamRunId: string, manifest: TeamMemberRunManifest): Promise<void> {
    const normalized = normalizeManifest(manifest);
    const manifestPath = this.getManifestPath(teamRunId, normalized.memberRunId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
    await fs.rename(tempPath, manifestPath);
  }

  async readManifest(teamRunId: string, memberRunId: string): Promise<TeamMemberRunManifest | null> {
    try {
      const raw = await fs.readFile(this.getManifestPath(teamRunId, memberRunId), "utf-8");
      const parsed = JSON.parse(raw);
      const manifest = validateManifest(parsed);
      if (!manifest) {
        logger.warn(
          `Invalid team member run manifest format for team '${teamRunId}', member '${memberRunId}'.`,
        );
        return null;
      }
      return normalizeManifest(manifest);
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(
          `Failed reading team member run manifest for team '${teamRunId}' member '${memberRunId}': ${message}`,
        );
      }
      return null;
    }
  }
}
