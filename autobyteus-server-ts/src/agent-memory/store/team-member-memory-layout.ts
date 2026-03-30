import fs from "node:fs/promises";
import path from "node:path";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const uniqueNormalizedIds = (memberRunIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const memberRunId of memberRunIds) {
    unique.add(normalizeRequiredString(memberRunId, "memberRunId"));
  }
  return Array.from(unique.values());
};

export class TeamMemberMemoryLayout {
  private readonly teamRootDir: string;

  constructor(memoryDir: string) {
    this.teamRootDir = path.join(memoryDir, "agent_teams");
  }

  getTeamRootDirPath(): string {
    return this.teamRootDir;
  }

  getTeamDirPath(teamRunId: string): string {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    return this.resolveSafeTeamPath(normalizedTeamRunId);
  }

  getMemberDirPath(teamRunId: string, memberRunId: string): string {
    const teamDir = this.getTeamDirPath(teamRunId);
    const normalizedMemberRunId = normalizeRequiredString(memberRunId, "memberRunId");
    const candidate = path.resolve(teamDir, normalizedMemberRunId);
    if (!candidate.startsWith(`${teamDir}${path.sep}`)) {
      throw new Error("Invalid team member directory path.");
    }
    return candidate;
  }

  async ensureLocalMemberSubtrees(teamRunId: string, memberRunIds: string[]): Promise<void> {
    const teamDir = this.getTeamDirPath(teamRunId);
    await fs.mkdir(teamDir, { recursive: true });
    const normalizedIds = uniqueNormalizedIds(memberRunIds);
    for (const memberRunId of normalizedIds) {
      await fs.mkdir(this.getMemberDirPath(teamRunId, memberRunId), { recursive: true });
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
