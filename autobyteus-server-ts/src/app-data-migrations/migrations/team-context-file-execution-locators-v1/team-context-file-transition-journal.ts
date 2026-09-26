import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { ContextFileRecordSource } from "../../../context-files/services/context-file-record-locators.js";
import { TeamContextFileLocatorTransition, type LocatorMapping } from "./team-context-file-locator-transition.js";

type FilePlan = { source: ContextFileRecordSource; originalHash: string; targetHash: string; mappings: LocatorMapping[]; committed: boolean };
type Manifest = { version: 1; complete: boolean; files: FilePlan[] };
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const read = (file: string) => fs.readFile(file, "utf8");

/** Durable original backups and hash-checked, restartable commits; never holds a dataset in memory. */
export class TeamContextFileTransitionJournal {
  constructor(private readonly directory: string, private readonly writer: AtomicRunPackageFileCommitWriter) {}
  private get manifestPath(): string { return path.join(this.directory, "manifest.json"); }
  private backup(file: FilePlan): string { return path.join(this.directory, `${digest(file.source.filePath)}.original`); }
  private async write(filePath: string, text: string): Promise<void> {
    const result = await this.writer.writeSerializedText({ file: "team_context_file_locators", filePath, text });
    if (result.outcome !== "committed") throw new Error(`${filePath}: ${result.outcome}:${result.stage}`);
  }
  private save(manifest: Manifest): Promise<void> { return this.write(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`); }

  async execute(transition: TeamContextFileLocatorTransition, sources: ContextFileRecordSource[]): Promise<number> {
    let manifest: Manifest;
    try {
      manifest = JSON.parse(await read(this.manifestPath)) as Manifest;
      if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error("Unsupported locator migration manifest.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      manifest = { version: 1, complete: false, files: [] };
    }
    const sourcePaths = new Set(sources.map((source) => source.filePath));
    for (const file of manifest.files) {
      if (!sourcePaths.has(file.source.filePath)) throw new Error(`Planned source disappeared: ${file.source.filePath}`);
    }
    // Preflight all current sources and all retry originals before any record writes.
    for (const source of sources) {
      const text = await read(source.filePath);
      const existing = manifest.files.find((file) => file.source.filePath === source.filePath);
      if (existing) {
        if (![existing.originalHash, existing.targetHash].includes(digest(text))) throw new Error(`Source changed after preflight: ${source.filePath}`);
        const original = await read(this.backup(existing));
        if (digest(original) !== existing.originalHash || digest(await transition.transform(source, original)) !== existing.targetHash) {
          throw new Error(`Original backup or ownership changed: ${source.filePath}`);
        }
      } else {
        const mappings: LocatorMapping[] = [];
        const target = await transition.transform(source, text, mappings);
        if (target !== text) manifest.files.push({ source, originalHash: digest(text), targetHash: digest(target), mappings, committed: false });
      }
    }
    // Backups precede the manifest and survive retries, including interruptions before first manifest save.
    for (const file of manifest.files) {
      let backup: string | null = null;
      try { backup = await read(this.backup(file)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      if (backup === null) {
        const original = await read(file.source.filePath);
        if (digest(original) !== file.originalHash) throw new Error(`Source changed before backup: ${file.source.filePath}`);
        await this.write(this.backup(file), original);
      } else if (digest(backup) !== file.originalHash) throw new Error(`Original backup conflict: ${file.source.filePath}`);
    }
    manifest.complete = false;
    await this.save(manifest);
    for (const file of manifest.files) {
      await transition.assertContainedRegularFile(file.source.filePath);
      const text = await read(file.source.filePath);
      const hash = digest(text);
      if (hash !== file.originalHash && hash !== file.targetHash) throw new Error(`Source changed before commit: ${file.source.filePath}`);
      const target = await transition.transform(file.source, await read(this.backup(file)));
      if (digest(target) !== file.targetHash) throw new Error(`Ownership changed before commit: ${file.source.filePath}`);
      // Also re-commit target bytes on a retry: an earlier rename may have had indeterminate directory finalization.
      if (hash !== file.targetHash || !file.committed) await this.write(file.source.filePath, target);
      const actual = await read(file.source.filePath);
      if (digest(actual) !== file.targetHash || await transition.transform(file.source, actual) !== actual) {
        throw new Error(`Strict locator validation failed: ${file.source.filePath}`);
      }
      file.committed = true;
      await this.save(manifest);
    }
    for (const source of sources) {
      const text = await read(source.filePath);
      if (await transition.transform(source, text) !== text) throw new Error(`Unconverted reference: ${source.filePath}`);
    }
    manifest.complete = true;
    await this.save(manifest);
    return manifest.files.length;
  }
}
