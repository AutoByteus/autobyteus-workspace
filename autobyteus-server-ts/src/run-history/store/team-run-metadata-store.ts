import fs from "node:fs/promises";
import path from "node:path";
import type { TeamRunMetadata } from "./team-run-metadata-types.js";
import {
  isUnsupportedLegacyTeamRunMetadataError,
  normalizeTeamRunMetadata,
  parseCurrentTeamRunMetadata,
} from "./team-run-metadata-schema.js";

export {
  LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_CODE,
  LEGACY_TEAM_RUN_METADATA_UPGRADE_REQUIRED_MESSAGE,
  LegacyTeamRunMetadataUpgradeRequiredError,
  UnsupportedLegacyTeamRunMetadataError,
  isLegacyTeamRunMetadataUpgradeRequiredError,
  isUnsupportedLegacyTeamRunMetadataError,
  parseCurrentTeamRunMetadata,
  toLegacyTeamRunMetadataUpgradeRequiredError,
} from "./team-run-metadata-schema.js";

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
    const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
    try {
      const raw = await fs.readFile(this.getMetadataPath(normalizedTeamRunId), "utf-8");
      const parsed = JSON.parse(raw);
      return parseCurrentTeamRunMetadata(parsed, normalizedTeamRunId);
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return null;
      }
      if (isUnsupportedLegacyTeamRunMetadataError(error)) {
        throw error;
      }
      logger.warn(`Failed reading team run metadata '${teamRunId}': ${String(error)}`);
      throw error;
    }
  }

  async writeMetadata(teamRunId: string, metadata: TeamRunMetadata): Promise<void> {
    const normalizedTeamRunId = normalizeTeamRunId(teamRunId);
    const normalized = normalizeTeamRunMetadata({
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
