import fs from "node:fs/promises";
import { AgentMemoryService } from "../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RunProjection } from "../projection/run-projection-types.js";
import { buildRunProjectionBundleFromEvents } from "../projection/run-projection-utils.js";
import { buildHistoricalReplayEvents } from "../projection/transformers/raw-trace-to-historical-replay-events.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const ensureDirectoryExists = async (dirPath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`Expected directory path but received non-directory: ${dirPath}`);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export class TeamMemberLocalRunProjectionReader {
  private readonly layout: TeamMemberMemoryLayout;

  constructor(memoryDir: string) {
    this.layout = new TeamMemberMemoryLayout(memoryDir);
  }

  async getProjection(teamRunId: string, memberRunId: string): Promise<RunProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberRunId = normalizeRequiredString(memberRunId, "memberRunId");
    const memberDir = this.layout.getMemberDirPath(normalizedTeamRunId, normalizedMemberRunId);
    const memberDirectoryExists = await ensureDirectoryExists(memberDir);
    if (!memberDirectoryExists) {
      return buildRunProjectionBundleFromEvents(normalizedMemberRunId, []);
    }

    const store = new MemoryFileStore(this.layout.getTeamDirPath(normalizedTeamRunId), {
      runRootSubdir: "",
      warnOnMissingFiles: false,
    });
    const memoryService = new AgentMemoryService(store);
    const view = memoryService.getRunMemoryView(normalizedMemberRunId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
      includeArchive: true,
    });

    return buildRunProjectionBundleFromEvents(
      normalizedMemberRunId,
      buildHistoricalReplayEvents(view.rawTraces ?? []),
    );
  }
}

let cachedTeamMemberLocalRunProjectionReader: TeamMemberLocalRunProjectionReader | null = null;

export const getTeamMemberLocalRunProjectionReader = (): TeamMemberLocalRunProjectionReader => {
  if (!cachedTeamMemberLocalRunProjectionReader) {
    cachedTeamMemberLocalRunProjectionReader = new TeamMemberLocalRunProjectionReader(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamMemberLocalRunProjectionReader;
};
