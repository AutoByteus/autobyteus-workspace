import fs from "node:fs/promises";
import { AgentMemoryViewService } from "../../agent-memory-view/services/agent-memory-view-service.js";
import { MemoryFileStore } from "../../agent-memory-view/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import type { RunProjection } from "./run-projection-service.js";

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

const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  const stat = await fs.stat(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`Expected directory path but received non-directory: ${dirPath}`);
  }
};

export class TeamMemberMemoryProjectionReader {
  private readonly layoutStore: TeamMemberMemoryLayoutStore;

  constructor(memoryDir: string) {
    this.layoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
  }

  async getProjection(teamRunId: string, memberAgentId: string): Promise<RunProjection> {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberAgentId = normalizeRequiredString(memberAgentId, "memberAgentId");
    const memberDir = this.layoutStore.getMemberDirPath(normalizedTeamId, normalizedMemberAgentId);
    await ensureDirectoryExists(memberDir);

    const store = new MemoryFileStore(this.layoutStore.getTeamDirPath(normalizedTeamId), {
      agentRootSubdir: "",
    });
    const memoryViewService = new AgentMemoryViewService(store);
    const view = memoryViewService.getRunMemoryView(normalizedMemberAgentId, {
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
      runId: normalizedMemberAgentId,
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
