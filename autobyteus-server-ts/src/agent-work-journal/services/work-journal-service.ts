import { createHash } from "node:crypto";
import path from "node:path";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import {
  RawTraceFileSourceService,
  type RawTraceFileSource,
} from "../../agent-memory/services/raw-trace-file-source-service.js";
import {
  WORK_JOURNAL_RENDERER_REVISION,
  type WorkJournalChangeListener,
  type WorkJournalFileSummary,
  type WorkJournalFileVersion,
  type WorkJournalLines,
  type WorkJournalManifest,
  type WorkJournalManifestFile,
  type WorkJournalPackage,
  type WorkJournalTarget,
} from "../domain/work-journal-models.js";
import { journalLines, readJournalEntries } from "../reading/journal-entry-reader.js";
import { WorkJournalFileRenderer } from "../rendering/work-journal-file-renderer.js";
import { WORK_JOURNAL_ACTIVE_FILE_NAME, WorkJournalStore, workJournalFileName } from "../store/work-journal-store.js";

/**
 * The agent runtime that wrote a raw file: an archived segment, the one recorded for it; the open file, the one the caller
 * names in the target (the live run's own, or for a run with a pending switch the previous one: `openRawTraceRuntimeKind`).
 * A segment that records none (or an unknown one) is rendered with the no-runtime rules.
 */
const fileRuntimeKind = (rawFile: RawTraceFileSource, target: WorkJournalTarget): RuntimeKind | null =>
  rawFile.kind === "segment" ? rawFile.runtimeKind : target.runtimeKind ?? null;

const sha256 = (text: string): string => createHash("sha256").update(text, "utf-8").digest("hex");

/** Most lines one `readJournalLines` call returns. */
export const MAX_JOURNAL_LINES_PER_READ = 400;

export type WorkJournalEnsureOptions = Readonly<{ regenerate?: boolean }>;

export type WorkJournalServiceDependencies = Readonly<{
  store?: WorkJournalStore;
  renderer?: WorkJournalFileRenderer;
  /** Raw traces of one run folder (its parent is the store root, its name the run id). */
  createRawTraceSource?: (memoryDir: string) => RawTraceFileSourceService;
}>;

const defaultRawTraceSource = (memoryDir: string): RawTraceFileSourceService =>
  new RawTraceFileSourceService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "", warnOnMissingFiles: false }));

/**
 * The journal of a run (DS-004): the only public entrypoint, the only writer and the only reader of
 * journal files. Closed files are written once and reused; the open file is rendered again on every
 * call. Callers for one run folder are serialized within the process. After a call that wrote or
 * removed a journal file, the change listeners are told (memory search follows journals this way).
 * Reads accept only journal files the run's manifest names, and never render.
 */
export class WorkJournalService {
  private readonly store: WorkJournalStore;
  private readonly renderer: WorkJournalFileRenderer;
  private readonly createRawTraceSource: (memoryDir: string) => RawTraceFileSourceService;
  private readonly tails = new Map<string, Promise<void>>();
  private readonly listeners = new Set<WorkJournalChangeListener>();

  constructor(deps: WorkJournalServiceDependencies = {}) {
    this.store = deps.store ?? new WorkJournalStore();
    this.renderer = deps.renderer ?? new WorkJournalFileRenderer();
    this.createRawTraceSource = deps.createRawTraceSource ?? defaultRawTraceSource;
  }

  /** The revision of the rendering rules, for consumers that must know when journals are rendered again. */
  get rendererRevision(): number {
    return WORK_JOURNAL_RENDERER_REVISION;
  }

  /**
   * Makes the run's journal current and returns its package. Errors reach the caller. `regenerate`
   * renders every file again whatever the stored files and revision say (memory search's Rebuild).
   */
  ensureCurrent(target: WorkJournalTarget, options: WorkJournalEnsureOptions = {}): Promise<WorkJournalPackage> {
    const memoryDir = path.resolve(target.memoryDir);
    return this.serialized(memoryDir, () => this.reconcile({ ...target, memoryDir }, options.regenerate === true));
  }

  /** Called after `ensureCurrent` wrote or removed a journal file. Returns the unsubscribe. */
  onJournalChanged(listener: WorkJournalChangeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** The run's journal files as its manifest records them (no file is read); empty without a journal. */
  async journalFileVersions(memoryDir: string): Promise<WorkJournalFileVersion[]> {
    const manifest = await this.store.readManifest(path.resolve(memoryDir));
    return (manifest?.files ?? []).map((file) => ({ journalFile: file.journal_file, state: file.state, contentSha256: file.content_sha256 }));
  }

  /** The run's journal files with size, line count and days; null when the run has no journal yet. */
  async listJournalFiles(memoryDir: string): Promise<WorkJournalFileSummary[] | null> {
    const dir = path.resolve(memoryDir);
    const manifest = await this.store.readManifest(dir);
    if (!manifest) return null;
    const summaries: WorkJournalFileSummary[] = [];
    for (const file of manifest.files) {
      const markdown = await this.store.readJournalFile(dir, file.journal_file);
      if (markdown === null) continue;
      const reading = readJournalEntries(markdown);
      summaries.push({
        journalFile: file.journal_file,
        state: file.state,
        sizeBytes: Buffer.byteLength(markdown, "utf-8"),
        lineCount: reading.lineCount,
        days: reading.days,
      });
    }
    return summaries;
  }

  /** Where a run's journal file is, to open it with a file tool. */
  journalFilePath(memoryDir: string, journalFile: string): string {
    return this.store.filePath(path.resolve(memoryDir), journalFile);
  }

  /** A whole journal file the manifest names; null when it is not one of the run's files. */
  async readJournalFile(memoryDir: string, journalFile: string): Promise<string | null> {
    const dir = path.resolve(memoryDir);
    if (!await this.isManifestFile(dir, journalFile)) return null;
    return this.store.readJournalFile(dir, journalFile);
  }

  /** Lines `start`…`end` (1-based, at most 400) of a journal file the manifest names; null otherwise. */
  async readJournalLines(memoryDir: string, journalFile: string, range: { start: number; end: number }): Promise<WorkJournalLines | null> {
    const markdown = await this.readJournalFile(memoryDir, journalFile);
    if (markdown === null) return null;
    const lines = journalLines(markdown);
    const start = Math.max(1, Math.floor(range.start));
    const end = Math.min(lines.length, Math.floor(range.end), start + MAX_JOURNAL_LINES_PER_READ - 1);
    return { journalFile, start, end: Math.max(start - 1, end), lineCount: lines.length, lines: lines.slice(start - 1, end) };
  }

  private async isManifestFile(memoryDir: string, journalFile: string): Promise<boolean> {
    const manifest = await this.store.readManifest(memoryDir);
    return Boolean(manifest?.files.some((file) => file.journal_file === journalFile));
  }

  private notify(target: WorkJournalTarget, journalPackage: WorkJournalPackage): void {
    for (const listener of this.listeners) {
      try {
        listener({ runId: target.runId, memoryDir: target.memoryDir, package: journalPackage });
      } catch (error) {
        console.warn("WORK_JOURNAL_CHANGE_LISTENER_FAILED", { runId: target.runId, error: error instanceof Error ? error.message : String(error) });
      }
    }
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

  private async reconcile(target: WorkJournalTarget, regenerate: boolean): Promise<WorkJournalPackage> {
    const { memoryDir } = target;
    const rawRunId = path.basename(memoryDir);
    const source = this.createRawTraceSource(memoryDir);
    const rawFiles = source.listFiles(rawRunId, "chronological");
    const previous = await this.store.readManifest(memoryDir);
    // Closed files are reusable only when today's rules for their own agent runtime produced them.
    const reusable = previous
      && !regenerate
      && previous.renderer_revision === WORK_JOURNAL_RENDERER_REVISION
      ? new Map(previous.files.map((file) => [file.journal_file, file]))
      : new Map<string, WorkJournalManifestFile>();

    const files: WorkJournalManifestFile[] = [];
    let changed = false;
    for (const rawFile of rawFiles) {
      const closed = rawFile.kind === "segment";
      const journalFile = workJournalFileName(closed ? rawFile.segmentIndex ?? 0 : null);
      const known = reusable.get(journalFile);
      if (closed && known && await this.isReusableClosedFile(memoryDir, known, rawFile, fileRuntimeKind(rawFile, target))) {
        files.push(known);
        continue;
      }
      const rendered = await this.renderFile(target, source, rawRunId, rawFile, journalFile, known ?? null);
      changed ||= rendered.written;
      files.push(rendered.file);
    }

    changed = await this.removeStaleFiles(memoryDir, previous, files) || changed;
    const manifest: WorkJournalManifest = {
      run_id: target.runId,
      renderer_revision: WORK_JOURNAL_RENDERER_REVISION,
      files,
    };
    await this.store.writeManifest(memoryDir, manifest);
    const journalPackage = this.toPackage(memoryDir, manifest);
    if (changed) this.notify(target, journalPackage);
    return journalPackage;
  }

  /** N4: the raw manifest's record count of the segment must equal the one rendered. */
  private async isReusableClosedFile(
    memoryDir: string,
    known: WorkJournalManifestFile,
    rawFile: RawTraceFileSource,
    runtimeKind: RuntimeKind | null,
  ): Promise<boolean> {
    return known.state === "closed"
      && known.runtime_kind === runtimeKind
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
  ): Promise<{ file: WorkJournalManifestFile; written: boolean }> {
    const closed = rawFile.kind === "segment";
    const { records } = source.readSource(rawRunId, rawFile);
    const runtimeKind = fileRuntimeKind(rawFile, target);
    const { markdown } = this.renderer.render({
      runId: target.runId,
      runtimeKind,
      source: { fileName: rawFile.fileName, state: closed ? "closed" : "open", index: closed ? rawFile.segmentIndex ?? 0 : null },
      records,
    });
    const contentSha256 = sha256(markdown);
    const unchanged = known?.content_sha256 === contentSha256 && await this.store.journalFileExists(target.memoryDir, journalFile);
    if (!unchanged) await this.store.writeJournalFile(target.memoryDir, journalFile, markdown);
    return {
      file: {
        journal_file: journalFile,
        source_file: rawFile.fileName,
        // The open file's count is informational: it is rendered again on every call.
        source_record_count: closed ? rawFile.recordCount : records.length,
        state: closed ? "closed" : "open",
        content_sha256: contentSha256,
        runtime_kind: runtimeKind,
      },
      written: !unchanged,
    };
  }

  /** A journal file whose raw file is gone (e.g. the active file just after rotation). True when one was removed. */
  private async removeStaleFiles(
    memoryDir: string,
    previous: WorkJournalManifest | null,
    files: readonly WorkJournalManifestFile[],
  ): Promise<boolean> {
    const current = new Set(files.map((file) => file.journal_file));
    const stale = new Set((previous?.files ?? []).map((file) => file.journal_file).filter((name) => !current.has(name)));
    if (!current.has(WORK_JOURNAL_ACTIVE_FILE_NAME)) stale.add(WORK_JOURNAL_ACTIVE_FILE_NAME);
    let removed = false;
    for (const journalFile of stale) {
      if (!await this.store.journalFileExists(memoryDir, journalFile)) continue;
      await this.store.removeJournalFile(memoryDir, journalFile);
      removed = true;
    }
    return removed;
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
