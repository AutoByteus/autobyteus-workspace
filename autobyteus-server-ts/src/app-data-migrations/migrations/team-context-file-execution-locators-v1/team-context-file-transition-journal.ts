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

/** The released V1 evidence remains authoritative. Commit one validated source group without touching excluded entries. */
export class TeamContextFileTransitionJournal {
  constructor(private readonly directory: string, private readonly writer: AtomicRunPackageFileCommitWriter) {}
  private get manifestPath(): string { return path.join(this.directory, "manifest.json"); }
  private backup(file: FilePlan): string { return path.join(this.directory, `${digest(file.source.filePath)}.original`); }
  private async write(filePath: string, text: string): Promise<void> {
    const result = await this.writer.writeSerializedText({ file: "team_context_file_locators", filePath, text });
    if (result.outcome !== "committed") throw new Error(`${filePath}: ${result.outcome}:${result.stage}`);
  }
  private save(manifest: Manifest): Promise<void> { return this.write(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`); }
  private async load(): Promise<Manifest> {
    try {
      const manifest = JSON.parse(await read(this.manifestPath)) as Manifest;
      if (manifest.version !== 1 || !Array.isArray(manifest.files) || typeof manifest.complete !== "boolean"
        || manifest.files.some((file) => !file.source || typeof file.source.filePath !== "string"
          || !["trace", "tasks", "messages"].includes(file.source.kind)
          || !/^[a-f0-9]{64}$/.test(file.originalHash) || !/^[a-f0-9]{64}$/.test(file.targetHash)
          || typeof file.committed !== "boolean" || !Array.isArray(file.mappings))
        || new Set(manifest.files.map((file) => file.source.filePath)).size !== manifest.files.length) {
        throw new Error("Unsupported locator migration manifest.");
      }
      return manifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { version: 1, complete: false, files: [] };
    }
  }

  async assertKnownGroups(directories: readonly string[]): Promise<void> {
    for (const file of (await this.load()).files) {
      if (!directories.some((dir) => file.source.filePath.startsWith(`${dir}${path.sep}`))) {
        throw new Error(`Released journal source cannot be reconciled to a discovered group: ${file.source.filePath}`);
      }
    }
  }

  /** A completed attempt can retain uncommitted historical plans only with explicit preserved exclusions. */
  async completeDispositions(excludedDirectories: readonly string[]): Promise<void> {
    const manifest = await this.load();
    if (manifest.complete || !manifest.files.length) return;
    if (!manifest.files.every((file) => file.committed || excludedDirectories.some((dir) => file.source.filePath.startsWith(`${dir}${path.sep}`)))) {
      throw new Error("Locator journal has an unfinished conversion without a completed disposition.");
    }
    manifest.complete = true;
    await this.save(manifest);
  }

  /** Read-only preflight runs before dependency closure and any group writes. */
  async preflight(transition: TeamContextFileLocatorTransition, sources: ContextFileRecordSource[], directory: string): Promise<void> {
    const manifest = await this.load();
    for (const file of manifest.files) {
      if (file.source.filePath.startsWith(`${directory}${path.sep}`) && !sources.some((source) => source.filePath === file.source.filePath)) {
        throw new Error(`Planned source disappeared: ${file.source.filePath}`);
      }
    }
    await this.plan(transition, sources, await this.load());
  }
  private async plan(transition: TeamContextFileLocatorTransition, sources: ContextFileRecordSource[], manifest: Manifest): Promise<FilePlan[]> {
    const plans: FilePlan[] = [];
    for (const source of sources) {
      const text = await read(source.filePath);
      const existing = manifest.files.find((file) => file.source.filePath === source.filePath);
      if (existing) {
        const original = await read(this.backup(existing));
        if (digest(original) !== existing.originalHash) throw new Error(`Original backup conflict: ${source.filePath}`);
        // Completed evidence must never restore over subsequent ordinary current writes.
        if (existing.committed && await transition.transform(source, text) === text) continue;
        if (![existing.originalHash, existing.targetHash].includes(digest(text))
          || digest(await transition.transform(source, original)) !== existing.targetHash) {
          throw new Error(`Source or ownership changed after preflight: ${source.filePath}`);
        }
        plans.push(existing);
      } else {
        const mappings: LocatorMapping[] = [];
        const target = await transition.transform(source, text, mappings);
        if (target !== text) plans.push({ source, originalHash: digest(text), targetHash: digest(target), mappings, committed: false });
      }
    }
    return plans;
  }

  async execute(transition: TeamContextFileLocatorTransition, sources: ContextFileRecordSource[]): Promise<number> {
    const manifest = await this.load();
    const plans = await this.plan(transition, sources, manifest);
    // No representational rewrite of already complete released evidence.
    if (!plans.length) {
      if (!manifest.complete && manifest.files.length && manifest.files.every((file) => file.committed)) {
        manifest.complete = true;
        await this.save(manifest);
      }
      return 0;
    }
    for (const file of plans) {
      let backup: string | null = null;
      try { backup = await read(this.backup(file)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      if (backup === null) {
        const original = await read(file.source.filePath);
        if (digest(original) !== file.originalHash) throw new Error(`Source changed before backup: ${file.source.filePath}`);
        await this.write(this.backup(file), original);
      } else if (digest(backup) !== file.originalHash) throw new Error(`Original backup conflict: ${file.source.filePath}`);
      if (!manifest.files.includes(file)) manifest.files.push(file);
    }
    manifest.complete = false;
    await this.save(manifest);
    for (const file of plans) {
      await transition.assertContainedRegularFile(file.source.filePath);
      const hash = digest(await read(file.source.filePath));
      if (hash !== file.originalHash && hash !== file.targetHash) throw new Error(`Source changed before commit: ${file.source.filePath}`);
      const target = await transition.transform(file.source, await read(this.backup(file)));
      if (digest(target) !== file.targetHash) throw new Error(`Ownership changed before commit: ${file.source.filePath}`);
      if (hash !== file.targetHash || !file.committed) await this.write(file.source.filePath, target);
      const actual = await read(file.source.filePath);
      if (digest(actual) !== file.targetHash || await transition.transform(file.source, actual) !== actual) throw new Error(`Strict locator validation failed: ${file.source.filePath}`);
      file.committed = true;
      await this.save(manifest);
    }
    for (const source of sources) {
      const text = await read(source.filePath);
      if (await transition.transform(source, text) !== text) throw new Error(`Unconverted reference: ${source.filePath}`);
    }
    manifest.complete = manifest.files.every((file) => file.committed);
    await this.save(manifest);
    return plans.length;
  }
}
