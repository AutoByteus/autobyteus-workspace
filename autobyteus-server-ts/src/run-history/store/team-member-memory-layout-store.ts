import fs from "node:fs/promises";
import path from "node:path";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const uniqueNormalizedIds = (memberAgentIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const memberAgentId of memberAgentIds) {
    const normalized = normalizeRequiredString(memberAgentId, "memberAgentId");
    unique.add(normalized);
  }
  return Array.from(unique.values());
};

export class TeamMemberMemoryLayoutStore {
  private readonly teamRootDir: string;

  constructor(memoryDir: string) {
    this.teamRootDir = path.join(memoryDir, "agent_teams");
  }

  getTeamRootDirPath(): string {
    return this.teamRootDir;
  }

  getTeamDirPath(teamRunId: string): string {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");
    return this.resolveSafeTeamPath(normalizedTeamId);
  }

  getMemberDirPath(teamRunId: string, memberAgentId: string): string {
    const teamDir = this.getTeamDirPath(teamRunId);
    const normalizedMemberAgentId = normalizeRequiredString(memberAgentId, "memberAgentId");
    const candidate = path.resolve(teamDir, normalizedMemberAgentId);
    if (!candidate.startsWith(`${teamDir}${path.sep}`)) {
      throw new Error("Invalid team member directory path.");
    }
    return candidate;
  }

  async ensureLocalMemberSubtrees(teamRunId: string, memberAgentIds: string[]): Promise<void> {
    const teamDir = this.getTeamDirPath(teamRunId);
    await fs.mkdir(teamDir, { recursive: true });
    const normalizedIds = uniqueNormalizedIds(memberAgentIds);
    for (const memberAgentId of normalizedIds) {
      await fs.mkdir(this.getMemberDirPath(teamRunId, memberAgentId), { recursive: true });
    }
  }

  async removeLocalMemberSubtrees(teamRunId: string, memberAgentIds: string[]): Promise<void> {
    const normalizedIds = uniqueNormalizedIds(memberAgentIds);
    for (const memberAgentId of normalizedIds) {
      const memberDir = this.getMemberDirPath(teamRunId, memberAgentId);
      await fs.rm(memberDir, { recursive: true, force: true });
    }
  }

  async removeTeamDirPath(teamRunId: string): Promise<void> {
    await fs.rm(this.getTeamDirPath(teamRunId), { recursive: true, force: true });
  }

  async removeTeamDirIfEmpty(teamRunId: string): Promise<void> {
    const teamDir = this.getTeamDirPath(teamRunId);
    try {
      const entries = await fs.readdir(teamDir);
      if (entries.length === 0) {
        await fs.rmdir(teamDir);
      }
    } catch (error) {
      if (!String(error).includes("ENOENT")) {
        throw error;
      }
    }
  }

  private resolveSafeTeamPath(teamRunId: string): string {
    const candidate = path.resolve(this.teamRootDir, teamRunId);
    const root = path.resolve(this.teamRootDir);
    if (!candidate.startsWith(`${root}${path.sep}`)) {
      throw new Error("Invalid team directory path.");
    }
    return candidate;
  }
}
