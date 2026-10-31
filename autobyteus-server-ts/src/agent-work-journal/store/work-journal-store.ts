import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  WorkJournalFileState,
  WorkJournalManifest,
  WorkJournalManifestFile,
} from "../domain/work-journal-models.js";

/** `<run memory folder>/work_journal/` and its fixed file names. */
export const WORK_JOURNAL_DIR_NAME = "work_journal";
export const WORK_JOURNAL_MANIFEST_FILE_NAME = "work_journal_manifest.json";
export const WORK_JOURNAL_ACTIVE_FILE_NAME = "work_journal_active.md";

/** The journal file of a closed raw segment (`work_journal_000002.md`) or of the active file. */
export const workJournalFileName = (segmentIndex: number | null): string =>
  segmentIndex === null ? WORK_JOURNAL_ACTIVE_FILE_NAME : `work_journal_${String(segmentIndex).padStart(6, "0")}.md`;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const JOURNAL_FILE_NAME = /^work_journal_(\d{6}|active)\.md$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** A manifest entry with every field known and valid, else null (that file is simply re-rendered). */
const readManifestFile = (value: unknown): WorkJournalManifestFile | null => {
  const entry = asRecord(value);
  if (!entry) return null;
  const { journal_file: journalFile, source_file: sourceFile, source_record_count: count, state, content_sha256: sha, runtime_kind: runtimeKind } = entry;
  if (typeof journalFile !== "string" || !JOURNAL_FILE_NAME.test(journalFile)) return null;
  if (typeof sourceFile !== "string" || !sourceFile || sourceFile !== path.basename(sourceFile)) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return null;
  if (state !== "closed" && state !== "open") return null;
  if (typeof sha !== "string" || !SHA256_HEX.test(sha)) return null;
  // An entry written before a file recorded its own agent runtime is dropped, so the file is rendered again.
  if (typeof runtimeKind !== "string" && runtimeKind !== null) return null;
  return { journal_file: journalFile, source_file: sourceFile, source_record_count: count, state: state as WorkJournalFileState, content_sha256: sha, runtime_kind: runtimeKind };
};

/**
 * Owns the paths, the manifest's read projection and exact write, and atomic writes inside
 * `work_journal/`. Only WorkJournalService uses it.
 */
export class WorkJournalStore {
  rootPath(memoryDir: string): string {
    return path.join(memoryDir, WORK_JOURNAL_DIR_NAME);
  }

  manifestPath(memoryDir: string): string {
    return path.join(this.rootPath(memoryDir), WORK_JOURNAL_MANIFEST_FILE_NAME);
  }

  filePath(memoryDir: string, journalFile: string): string {
    return path.join(this.rootPath(memoryDir), journalFile);
  }

  /**
   * Projection of the known fields (guideline §3): a missing or unreadable manifest is absent and
   * an invalid entry is dropped; either only means those files are rendered again.
   */
  async readManifest(memoryDir: string): Promise<WorkJournalManifest | null> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(this.manifestPath(memoryDir), "utf-8"));
    } catch {
      return null;
    }
    const manifest = asRecord(parsed);
    if (!manifest) return null;
    const { run_id: runId, renderer_revision: revision, files } = manifest;
    if (typeof runId !== "string" || typeof revision !== "number") return null;
    return {
      run_id: runId,
      renderer_revision: revision,
      files: Array.isArray(files) ? files.map(readManifestFile).filter((file): file is WorkJournalManifestFile => file !== null) : [],
    };
  }

  /** The exact manifest shape, nothing more (no generation time, no paths). */
  async writeManifest(memoryDir: string, manifest: WorkJournalManifest): Promise<void> {
    const exact: WorkJournalManifest = {
      run_id: manifest.run_id,
      renderer_revision: manifest.renderer_revision,
      files: manifest.files.map((file) => ({
        journal_file: file.journal_file,
        source_file: file.source_file,
        source_record_count: file.source_record_count,
        state: file.state,
        content_sha256: file.content_sha256,
        runtime_kind: file.runtime_kind,
      })),
    };
    await this.writeAtomically(this.manifestPath(memoryDir), `${JSON.stringify(exact, null, 2)}\n`);
  }

  async writeJournalFile(memoryDir: string, journalFile: string, markdown: string): Promise<void> {
    await this.writeAtomically(this.filePath(memoryDir, journalFile), markdown);
  }

  /** A journal file's text; null when it does not exist. */
  async readJournalFile(memoryDir: string, journalFile: string): Promise<string | null> {
    try {
      return await fs.readFile(this.filePath(memoryDir, journalFile), "utf-8");
    } catch {
      return null;
    }
  }

  async journalFileExists(memoryDir: string, journalFile: string): Promise<boolean> {
    try {
      return (await fs.stat(this.filePath(memoryDir, journalFile))).isFile();
    } catch {
      return false;
    }
  }

  async removeJournalFile(memoryDir: string, journalFile: string): Promise<void> {
    await fs.rm(this.filePath(memoryDir, journalFile), { force: true });
  }

  /** Write to `<file>.<random>.tmp`, then rename; memory sync skips `.tmp` files. */
  private async writeAtomically(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
