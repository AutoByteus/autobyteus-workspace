import fs from "node:fs";
import path from "node:path";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import type { MemoryRun } from "../domain/memory-search-models.js";

/** Raw-trace files in a run folder: the active file and the manifests; archived segments are in their own folder. */
const RAW_TRACE_FILE = /^raw_traces(?:_[^/]*)?\.jsonl$|^raw_traces(?:_archive)?_manifest\.json$/;
const RAW_TRACE_ARCHIVE_DIR = "raw_traces_archive";

const fileStamps = (dir: string, prefix: string, keep: (name: string) => boolean): string[] => {
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter(keep).sort();
  } catch {
    return [];
  }
  return names.map((name) => {
    try {
      const stat = fs.statSync(path.join(dir, name));
      return `${prefix}${name}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
    } catch {
      return `${prefix}${name}:missing`;
    }
  });
};

/**
 * The run's raw traces as names, sizes and modification times (the run folder's raw-trace files and its
 * archive folder), and the revision of the journal's rendering rules. Unchanged means its journal is
 * current, so `ensureCurrent` (which renders the open file again on every call) is skipped; a new
 * revision changes every fingerprint, so the next pass renders every journal again. Empty when the
 * folder has no raw traces.
 */
export const rawTraceFingerprint = (memoryDir: string, rendererRevision: number): string => {
  const stamps = [
    ...fileStamps(memoryDir, "", (name) => RAW_TRACE_FILE.test(name)),
    ...fileStamps(path.join(memoryDir, RAW_TRACE_ARCHIVE_DIR), `${RAW_TRACE_ARCHIVE_DIR}/`, () => true),
  ];
  return stamps.length ? [...stamps, `renderer:${rendererRevision}`].join("|") : "";
};

export type JournalsStepRun = Readonly<{ run: MemoryRun; storedFingerprint: string | null }>;

/**
 * The "Journals" step: makes each changed run's journal current through the journal service (the only
 * reader of raw traces), with the runtime as recorded or `null` (the generic rule). `regenerate` (Rebuild)
 * renders every journal again. Returns the fingerprints to keep; a run whose journal failed keeps none, so the next pass tries again.
 */
export const makeJournalsCurrent = async (
  journals: Pick<WorkJournalService, "ensureCurrent" | "rendererRevision">,
  runs: readonly JournalsStepRun[],
  progress: (done: number) => void,
  shouldStop: () => boolean,
  regenerate: boolean,
): Promise<Map<string, string>> => {
  const kept = new Map<string, string>();
  let done = 0;
  for (const { run, storedFingerprint } of runs) {
    if (shouldStop()) break;
    const fingerprint = rawTraceFingerprint(run.memoryDir, journals.rendererRevision);
    if (fingerprint && fingerprint !== storedFingerprint) {
      try {
        await journals.ensureCurrent({ runId: run.runId, memoryDir: run.memoryDir, runtimeKind: run.runtimeKind }, { regenerate });
        kept.set(run.runKey, fingerprint);
      } catch (error) {
        console.warn("MEMORY_SEARCH_JOURNAL_FAILED", { runKey: run.runKey, error: error instanceof Error ? error.message : String(error) });
      }
      // Searches are served first: yield between runs.
      await new Promise((resolve) => setImmediate(resolve));
    }
    progress(++done);
  }
  return kept;
};
