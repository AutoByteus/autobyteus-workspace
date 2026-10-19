import { createHash } from "node:crypto";
import path from "node:path";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import {
  RawTraceFileSourceService,
  type RawTraceFileSource,
} from "../../agent-memory/services/raw-trace-file-source-service.js";
import {
  WORK_JOURNAL_RENDERER_REVISION,
  type WorkJournalManifest,
  type WorkJournalManifestFile,
  type WorkJournalPackage,
  type WorkJournalTarget,
} from "../domain/work-journal-models.js";
import { WorkJournalFileRenderer } from "../rendering/work-journal-file-renderer.js";
import { WORK_JOURNAL_ACTIVE_FILE_NAME, WorkJournalStore, workJournalFileName } from "../store/work-journal-store.js";

const sha256 = (text: string): string => createHash("sha256").update(text, "utf-8").digest("hex");

export type WorkJournalServiceDependencies = Readonly<{
  store?: WorkJournalStore;
  renderer?: WorkJournalFileRenderer;
  /** Raw traces of one run folder (its parent is the store root, its name the run id). */
  createRawTraceSource?: (memoryDir: string) => RawTraceFileSourceService;
}>;

const defaultRawTraceSource = (memoryDir: string): RawTraceFileSourceService =>
  new RawTraceFileSourceService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "", warnOnMissingFiles: false }));

/**
 * The journal of a run (DS-004): the only public entrypoint and the only writer. Closed files are
 * written once and reused; the open file is rendered again on every call. Callers for one run
 * folder are serialized within the process.
 */
export class WorkJournalService {
  private readonly store: WorkJournalStore;
  private readonly renderer: WorkJournalFileRenderer;
  private readonly createRawTraceSource: (memoryDir: string) => RawTraceFileSourceService;
  private readonly tails = new Map<string, Promise<void>>();

  constructor(deps: WorkJournalServiceDependencies = {}) {
    this.store = deps.store ?? new WorkJournalStore();
    this.renderer = deps.renderer ?? new WorkJournalFileRenderer();
    this.createRawTraceSource = deps.createRawTraceSource ?? defaultRawTraceSource;
  }

  /** Makes the run's journal current and returns its package. Errors reach the caller. */
  ensureCurrent(target: WorkJournalTarget): Promise<WorkJournalPackage> {
    const memoryDir = path.resolve(target.memoryDir);
    return this.serialized(memoryDir, () => this.reconcile({ ...target, memoryDir }));
  }

  private async serialized<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const run = previous.then(work);
    const tail = run.then(() => undefined, () => undefined);
    this.tails.set(key, tail);
    try {
      return await run;
    } finally {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }

  private async reconcile(target: WorkJournalTarget): Promise<WorkJournalPackage> {
    const { memoryDir } = target;
    const rawRunId = path.basename(memoryDir);
    const source = this.createRawTraceSource(memoryDir);
    const rawFiles = source.listFiles(rawRunId, "chronological");
    const previous = await this.store.readManifest(memoryDir);
    // Closed files are reusable only when today's rules for this runtime produced them.
    const reusable = previous
      && previous.renderer_revision === WORK_JOURNAL_RENDERER_REVISION
      && previous.runtime_kind === target.runtimeKind
      ? new Map(previous.files.map((file) => [file.journal_file, file]))
      : new Map<string, WorkJournalManifestFile>();

    const files: WorkJournalManifestFile[] = [];
    for (const rawFile of rawFiles) {
      const closed = rawFile.kind === "segment";
      const journalFile = workJournalFileName(closed ? rawFile.segmentIndex ?? 0 : null);
      const known = reusable.get(journalFile);
      if (closed && known && await this.isReusableClosedFile(memoryDir, known, rawFile)) {
        files.push(known);
        continue;
      }
      files.push(await this.renderFile(target, source, rawRunId, rawFile, journalFile, known ?? null));
    }

    await this.removeStaleFiles(memoryDir, previous, files);
    const manifest: WorkJournalManifest = {
      run_id: target.runId,
      runtime_kind: target.runtimeKind,
      renderer_revision: WORK_JOURNAL_RENDERER_REVISION,
      files,
    };
    await this.store.writeManifest(memoryDir, manifest);
    return this.toPackage(memoryDir, manifest);
  }

  /** N4: the raw manifest's record count of the segment must equal the one rendered. */
  private async isReusableClosedFile(
    memoryDir: string,
    known: WorkJournalManifestFile,
    rawFile: RawTraceFileSource,
  ): Promise<boolean> {
    return known.state === "closed"
      && known.source_file === rawFile.fileName
      && known.source_record_count === rawFile.recordCount
      && await this.store.journalFileExists(memoryDir, known.journal_file);
  }

  private async renderFile(
    target: WorkJournalTarget,
    source: RawTraceFileSourceService,
    rawRunId: string,
    rawFile: RawTraceFileSource,
    journalFile: string,
    known: WorkJournalManifestFile | null,
  ): Promise<WorkJournalManifestFile> {
    const closed = rawFile.kind === "segment";
    const { records } = source.readSource(rawRunId, rawFile);
    const { markdown } = this.renderer.render({
      runId: target.runId,
      runtimeKind: target.runtimeKind,
      source: { fileName: rawFile.fileName, state: closed ? "closed" : "open", index: closed ? rawFile.segmentIndex ?? 0 : null },
      records,
    });
    const contentSha256 = sha256(markdown);
    const unchanged = known?.content_sha256 === contentSha256 && await this.store.journalFileExists(target.memoryDir, journalFile);
    if (!unchanged) await this.store.writeJournalFile(target.memoryDir, journalFile, markdown);
    return {
      journal_file: journalFile,
      source_file: rawFile.fileName,
      // The open file's count is informational: it is rendered again on every call.
      source_record_count: closed ? rawFile.recordCount : records.length,
      state: closed ? "closed" : "open",
      content_sha256: contentSha256,
    };
  }

  /** A journal file whose raw file is gone (e.g. the active file just after rotation). */
  private async removeStaleFiles(
    memoryDir: string,
    previous: WorkJournalManifest | null,
    files: readonly WorkJournalManifestFile[],
  ): Promise<void> {
    const current = new Set(files.map((file) => file.journal_file));
    const stale = new Set((previous?.files ?? []).map((file) => file.journal_file).filter((name) => !current.has(name)));
    if (!current.has(WORK_JOURNAL_ACTIVE_FILE_NAME)) stale.add(WORK_JOURNAL_ACTIVE_FILE_NAME);
    for (const journalFile of stale) await this.store.removeJournalFile(memoryDir, journalFile);
  }

  /**
   * N3: the evidence hash covers every file's content, in order, through the content hashes the
   * manifest keeps, so closed files are never read again.
   */
  private toPackage(memoryDir: string, manifest: WorkJournalManifest): WorkJournalPackage {
    return {
      rootPath: this.store.rootPath(memoryDir),
      manifestPath: this.store.manifestPath(memoryDir),
      files: manifest.files.map((file) => ({
        path: this.store.filePath(memoryDir, file.journal_file),
        sourceFile: file.source_file,
        state: file.state,
      })),
      evidenceHash: sha256(manifest.files.map((file) => `${file.journal_file} ${file.content_sha256}\n`).join("")),
    };
  }
}

let instance: WorkJournalService | null = null;

/** One process-wide instance, so the per-run serialization covers every caller. */
export const getWorkJournalService = (): WorkJournalService => {
  instance ??= new WorkJournalService();
  return instance;
};
