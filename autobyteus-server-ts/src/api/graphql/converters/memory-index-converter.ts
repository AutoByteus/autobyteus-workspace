import type { MemorySnapshotPage as DomainMemorySnapshotPage } from "../../../agent-memory-view/domain/models.js";
import type { MemorySnapshotPage as GraphqlMemorySnapshotPage } from "../types/memory-index.js";

export class MemoryIndexConverter {
  static toGraphql(domain: DomainMemorySnapshotPage): GraphqlMemorySnapshotPage {
    return {
      entries: domain.entries.map((summary) => ({
        runId: summary.runId,
        lastUpdatedAt: summary.lastUpdatedAt ?? null,
        hasWorkingContext: summary.hasWorkingContext,
        hasEpisodic: summary.hasEpisodic,
        hasSemantic: summary.hasSemantic,
        hasRawTraces: summary.hasRawTraces,
        hasRawArchive: summary.hasRawArchive,
      })),
      total: domain.total,
      page: domain.page,
      pageSize: domain.pageSize,
      totalPages: domain.totalPages,
    };
  }
}
