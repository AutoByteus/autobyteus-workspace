import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeMemberAgentIds = (memberAgentIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const memberAgentId of memberAgentIds) {
    unique.add(normalizeRequiredString(memberAgentId, "memberAgentId"));
  }
  return Array.from(unique.values());
};

export class TeamHistoryWorkerCleanupHandler {
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;

  constructor(memoryDir: string) {
    this.memberLayoutStore = new TeamMemberMemoryLayoutStore(memoryDir);
  }

  async cleanupMemberSubtrees(input: {
    teamRunId: string;
    memberAgentIds: string[];
  }): Promise<{ deletedMemberCount: number }> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const memberAgentIds = normalizeMemberAgentIds(input.memberAgentIds);
    await this.memberLayoutStore.removeLocalMemberSubtrees(teamRunId, memberAgentIds);
    await this.memberLayoutStore.removeTeamDirIfEmpty(teamRunId);
    return {
      deletedMemberCount: memberAgentIds.length,
    };
  }
}
