import fs from "node:fs/promises";
import { AgentMemoryService } from "./agent-memory-service.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamMemberMemoryLayout } from "../store/team-member-memory-layout.js";
import type { RunProjection } from "../../run-history/projection/run-projection-types.js";

const toIsoString = (ts?: number | null): string | null => {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
    return null;
  }
  return new Date(ts * 1000).toISOString();
};

const compactSummary = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length <= 100) {
    return normalized;
  }
  return `${normalized.slice(0, 97)}...`;
};

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

export class TeamMemberMemoryProjectionReader {
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
      return {
        runId: normalizedMemberRunId,
        conversation: [],
        summary: null,
        lastActivityAt: null,
      };
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
      includeConversation: true,
      includeRawTraces: false,
      includeArchive: true,
    });

    const conversation = view.conversation ?? [];
    const firstUser = conversation.find((entry) => entry.role === "user" && entry.content);
    const lastEntry = conversation.length > 0 ? conversation[conversation.length - 1] : null;

    return {
      runId: normalizedMemberRunId,
      conversation,
      summary: compactSummary(firstUser?.content ?? null),
      lastActivityAt: toIsoString(lastEntry?.ts ?? null),
    };
  }
}

let cachedTeamMemberMemoryProjectionReader: TeamMemberMemoryProjectionReader | null = null;

export const getTeamMemberMemoryProjectionReader = (): TeamMemberMemoryProjectionReader => {
  if (!cachedTeamMemberMemoryProjectionReader) {
    cachedTeamMemberMemoryProjectionReader = new TeamMemberMemoryProjectionReader(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamMemberMemoryProjectionReader;
};
