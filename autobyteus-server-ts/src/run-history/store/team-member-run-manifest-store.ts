import fs from "node:fs/promises";
import path from "node:path";
import { TeamMemberRunManifest, TeamRunKnownStatus } from "../domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "./team-member-memory-layout-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import { normalizeRuntimeKind } from "../../runtime-management/runtime-kind.js";

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
  runtimeKind: normalizeRuntimeKind(manifest.runtimeKind),
  runtimeReference:
    manifest.runtimeReference && typeof manifest.runtimeReference === "object"
      ? {
          runtimeKind: normalizeRuntimeKind(
            manifest.runtimeReference.runtimeKind,
            normalizeRuntimeKind(manifest.runtimeKind),
          ),
          sessionId: manifest.runtimeReference.sessionId ?? null,
          threadId: manifest.runtimeReference.threadId ?? null,
          metadata: manifest.runtimeReference.metadata ?? null,
        }
      : null,
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
    typeof payload.runtimeKind !== "string" ||
    (payload.runtimeReference !== null &&
      payload.runtimeReference !== undefined &&
      (typeof payload.runtimeReference !== "object" ||
        Array.isArray(payload.runtimeReference))) ||
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
    runtimeKind: normalizeRuntimeKind(payload.runtimeKind),
    runtimeReference:
      payload.runtimeReference &&
      typeof payload.runtimeReference === "object" &&
      !Array.isArray(payload.runtimeReference)
        ? {
            runtimeKind: normalizeRuntimeKind(
              (payload.runtimeReference as Record<string, unknown>).runtimeKind,
              normalizeRuntimeKind(payload.runtimeKind),
            ),
            sessionId:
              typeof (payload.runtimeReference as Record<string, unknown>).sessionId === "string"
                ? ((payload.runtimeReference as Record<string, unknown>).sessionId as string)
                : null,
            threadId:
              typeof (payload.runtimeReference as Record<string, unknown>).threadId === "string"
                ? ((payload.runtimeReference as Record<string, unknown>).threadId as string)
                : null,
            metadata:
              (payload.runtimeReference as Record<string, unknown>).metadata &&
              typeof (payload.runtimeReference as Record<string, unknown>).metadata === "object" &&
              !Array.isArray((payload.runtimeReference as Record<string, unknown>).metadata)
                ? ((payload.runtimeReference as Record<string, unknown>).metadata as Record<
                    string,
                    unknown
                  >)
                : null,
          }
        : null,
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
  private readonly manifestByMemberRunId = new Map<string, TeamMemberRunManifest>();
  private indexLoaded = false;
  private indexLoadPromise: Promise<void> | null = null;

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
    this.manifestByMemberRunId.set(normalized.memberRunId, normalized);
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
      const normalized = normalizeManifest(manifest);
      this.manifestByMemberRunId.set(normalized.memberRunId, normalized);
      return normalized;
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

  async findManifestByMemberRunId(memberRunId: string): Promise<TeamMemberRunManifest | null> {
    const normalizedMemberRunId = normalizeRequiredString(memberRunId, "memberRunId");
    const cachedManifest = this.manifestByMemberRunId.get(normalizedMemberRunId);
    if (cachedManifest) {
      return cachedManifest;
    }

    await this.ensureIndexLoaded();
    return this.manifestByMemberRunId.get(normalizedMemberRunId) ?? null;
  }

  private async ensureIndexLoaded(): Promise<void> {
    if (this.indexLoaded) {
      return;
    }

    if (!this.indexLoadPromise) {
      this.indexLoadPromise = this.buildIndexFromDisk().finally(() => {
        this.indexLoadPromise = null;
      });
    }

    await this.indexLoadPromise;
  }

  private async buildIndexFromDisk(): Promise<void> {
    const teamRootDir = this.layoutStore.getTeamRootDirPath();

    try {
      const teamEntries = await fs.readdir(teamRootDir, { withFileTypes: true });
      for (const entry of teamEntries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const teamDirPath = path.join(teamRootDir, entry.name);
        const memberEntries = await fs.readdir(teamDirPath, { withFileTypes: true });
        for (const memberEntry of memberEntries) {
          if (!memberEntry.isDirectory()) {
            continue;
          }
          await this.readManifest(entry.name, memberEntry.name);
        }
      }
      this.indexLoaded = true;
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(`Failed building team member run manifest index: ${message}`);
      }
    }
  }
}
