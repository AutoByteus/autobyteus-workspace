import type { MemorySnapshotPage, MemorySnapshotSummary } from "../domain/models.js";
import type { MemoryFileStore } from "../store/memory-file-store.js";

export class AgentMemoryIndexService {
  private store: MemoryFileStore;

  constructor(store: MemoryFileStore) {
    this.store = store;
  }

  listSnapshots(search?: string | null, page = 1, pageSize = 50): MemorySnapshotPage {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);

    let runIds = this.store.listRunDirs();
    if (search && search.trim()) {
      const query = search.toLowerCase();
      runIds = runIds.filter((runId) => runId.toLowerCase().includes(query));
    }

    const summariesWithMtime: Array<{ summary: MemorySnapshotSummary; mtime: number }> = [];
    for (const runId of runIds) {
      const { summary, lastMtime } = this.buildSummary(runId);
      summariesWithMtime.push({ summary, mtime: lastMtime ?? 0 });
    }

    summariesWithMtime.sort((a, b) => {
      if (a.mtime !== b.mtime) {
        return b.mtime - a.mtime;
      }
      return b.summary.runId.localeCompare(a.summary.runId);
    });

    const summaries = summariesWithMtime.map((item) => item.summary);
    const total = summaries.length;
    const totalPages = Math.ceil(total / safePageSize);
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;

    return {
      entries: summaries.slice(start, end),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    };
  }

  private buildSummary(runId: string): { summary: MemorySnapshotSummary; lastMtime?: number | null } {
    const runDir = this.store.getRunDir(runId);
    const workingContextInfo = this.store.getFileInfo(`${runDir}/working_context_snapshot.json`);
    const episodicInfo = this.store.getFileInfo(`${runDir}/episodic.jsonl`);
    const semanticInfo = this.store.getFileInfo(`${runDir}/semantic.jsonl`);
    const rawTracesInfo = this.store.getFileInfo(`${runDir}/raw_traces.jsonl`);
    const rawArchiveInfo = this.store.getFileInfo(`${runDir}/raw_traces_archive.jsonl`);

    const mtimes = [
      workingContextInfo,
      episodicInfo,
      semanticInfo,
      rawTracesInfo,
      rawArchiveInfo,
    ]
      .filter((info): info is { exists: true; mtime: number } => Boolean(info))
      .map((info) => info.mtime);

    const lastMtime = mtimes.length ? Math.max(...mtimes) : null;
    const lastUpdatedAt = lastMtime
      ? new Date(lastMtime * 1000).toISOString().replace(/\.\d{3}Z$/, "Z")
      : null;

    return {
      summary: {
        runId,
        lastUpdatedAt,
        hasWorkingContext: workingContextInfo !== null,
        hasEpisodic: episodicInfo !== null,
        hasSemantic: semanticInfo !== null,
        hasRawTraces: rawTracesInfo !== null,
        hasRawArchive: rawArchiveInfo !== null,
      },
      lastMtime,
    };
  }
}
