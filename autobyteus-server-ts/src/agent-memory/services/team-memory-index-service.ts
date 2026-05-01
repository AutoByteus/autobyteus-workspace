import { TeamRunMetadataStore } from "../../run-history/store/team-run-metadata-store.js";
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { MemoryFileStore } from "../store/memory-file-store.js";

export type TeamMemberMemorySnapshotSummary = {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  lastUpdatedAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
};

export type TeamRunMemorySnapshotSummary = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  lastUpdatedAt?: string | null;
  members: TeamMemberMemorySnapshotSummary[];
};

export type TeamRunMemorySnapshotPage = {
  entries: TeamRunMemorySnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const toIsoWithoutMs = (mtime?: number | null): string | null => {
  if (!mtime || mtime <= 0) {
    return null;
  }
  return new Date(mtime * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
};

const normalizeSearch = (search?: string | null): string => (search || "").trim().toLowerCase();

type TeamEntryWithMtime = {
  entry: TeamRunMemorySnapshotSummary;
  mtime: number;
};

export class TeamMemoryIndexService {
  private readonly metadataStore: TeamRunMetadataStore;

  constructor(memoryDir: string) {
    this.metadataStore = new TeamRunMetadataStore(memoryDir);
  }

  async listTeamSnapshots(
    search?: string | null,
    page = 1,
    pageSize = 50,
  ): Promise<TeamRunMemorySnapshotPage> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const query = normalizeSearch(search);
    const teamRunIds = await this.metadataStore.listTeamRunIds();

    const entriesWithMtime: TeamEntryWithMtime[] = [];
    for (const teamRunId of teamRunIds) {
      const built = await this.buildTeamEntry(teamRunId, query);
      if (!built) {
        continue;
      }
      entriesWithMtime.push(built);
    }

    entriesWithMtime.sort((a, b) => {
      if (a.mtime !== b.mtime) {
        return b.mtime - a.mtime;
      }
      return b.entry.teamRunId.localeCompare(a.entry.teamRunId);
    });

    const entries = entriesWithMtime.map((item) => item.entry);
    const total = entries.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;

    return {
      entries: entries.slice(start, end),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    };
  }

  private async buildTeamEntry(
    teamRunId: string,
    query: string,
  ): Promise<TeamEntryWithMtime | null> {
    const metadata = await this.metadataStore.readMetadata(teamRunId);
    if (!metadata) {
      return null;
    }

    const teamDir = this.metadataStore.getTeamDirPath(teamRunId);
    const memoryStore = new MemoryFileStore(teamDir, { runRootSubdir: "" });

    const memberSummaries: Array<{ summary: TeamMemberMemorySnapshotSummary; mtime: number }> = [];
    for (const member of metadata.memberMetadata) {
      const memberSummary = this.buildMemberSummary(memoryStore, member);
      memberSummaries.push(memberSummary);
    }

    const teamMatch =
      query.length === 0 ||
      teamRunId.toLowerCase().includes(query) ||
      metadata.teamDefinitionName.toLowerCase().includes(query);

    const filteredMembers = teamMatch
      ? memberSummaries
      : memberSummaries.filter(({ summary }) => {
          return (
            summary.memberName.toLowerCase().includes(query) ||
            summary.memberRouteKey.toLowerCase().includes(query) ||
            summary.memberRunId.toLowerCase().includes(query)
          );
        });

    if (filteredMembers.length === 0) {
      return null;
    }

    const teamMtime = filteredMembers.reduce((max, item) => Math.max(max, item.mtime), 0);

    return {
      entry: {
        teamRunId,
        teamDefinitionId: metadata.teamDefinitionId,
        teamDefinitionName: metadata.teamDefinitionName,
        lastUpdatedAt: toIsoWithoutMs(teamMtime),
        members: filteredMembers.map((item) => item.summary),
      },
      mtime: teamMtime,
    };
  }

  private buildMemberSummary(
    memoryStore: MemoryFileStore,
    member: {
      memberRouteKey: string;
      memberName: string;
      memberRunId: string;
    },
  ): { summary: TeamMemberMemorySnapshotSummary; mtime: number } {
    const runDir = memoryStore.getRunDir(member.memberRunId);
    const workingContextInfo = memoryStore.getFileInfo(`${runDir}/${WORKING_CONTEXT_SNAPSHOT_FILE_NAME}`);
    const episodicInfo = memoryStore.getFileInfo(`${runDir}/${EPISODIC_MEMORY_FILE_NAME}`);
    const semanticInfo = memoryStore.getFileInfo(`${runDir}/${SEMANTIC_MEMORY_FILE_NAME}`);
    const rawTracesInfo = memoryStore.getFileInfo(`${runDir}/${RAW_TRACES_MEMORY_FILE_NAME}`);
    const rawArchiveInfo = memoryStore.getRawTraceArchiveInfo(member.memberRunId);

    const mtimes = [
      workingContextInfo,
      episodicInfo,
      semanticInfo,
      rawTracesInfo,
      rawArchiveInfo,
    ]
      .filter((info): info is { exists: true; mtime: number } => Boolean(info))
      .map((info) => info.mtime);

    const memberMtime = mtimes.length ? Math.max(...mtimes) : 0;

    return {
      summary: {
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        memberRunId: member.memberRunId,
        lastUpdatedAt: toIsoWithoutMs(memberMtime),
        hasWorkingContext: workingContextInfo !== null,
        hasEpisodic: episodicInfo !== null,
        hasSemantic: semanticInfo !== null,
        hasRawTraces: rawTracesInfo !== null,
        hasRawArchive: rawArchiveInfo !== null,
      },
      mtime: memberMtime,
    };
  }
}
