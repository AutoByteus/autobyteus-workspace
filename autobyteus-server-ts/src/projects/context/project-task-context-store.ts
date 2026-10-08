import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import { withFilePathLock } from "../../persistence/file/store-utils.js";
import {
  buildStoredFilename, CONTEXT_FILE_DRAFT_TTL_MS, CONTEXT_FILE_MAX_BYTES, contextFileMimeTypeForPath,
} from "../../context-files/domain/context-file-upload-policy.js";
import { writeContextFileUpload } from "../../context-files/services/context-file-upload-writer.js";
import type { ProjectTaskContextFile, ProjectTaskDraftManifest } from "../domain/project-task-context.js";
import { ProjectError } from "../domain/project-errors.js";
import { ProjectsLayout } from "../stores/projects-layout.js";

export interface PreparedTaskContext { files: ProjectTaskContextFile[]; draftId?: string; consumed: string[] }
interface LocalContextSource { sourcePath: string; displayName: string; mimeType: string }
const missing = (): never => { throw new ProjectError("TASK_CONTEXT_NOT_FOUND", "Task context was not found."); };
const invalidSource = (sourcePath: string, reason: string) => new ProjectError("TASK_CONTEXT_INVALID", `Context file '${sourcePath}' ${reason}`);
const unavailableSource = (sourcePath: string, reason: string) => new ProjectError("TASK_CONTEXT_FILE_UNAVAILABLE", `Context file '${sourcePath}' ${reason}`);
const tooLarge = (sourcePath: string) => invalidSource(sourcePath, `is larger than the ${CONTEXT_FILE_MAX_BYTES / (1024 * 1024)} MiB limit.`);
/** Same rule as delegate_task reference files: a normalized absolute path naming an existing, readable regular file. */
const localContextSource = async (sourcePath: string): Promise<LocalContextSource> => {
  if (!path.isAbsolute(sourcePath) || path.normalize(sourcePath) !== sourcePath) throw invalidSource(sourcePath, "must be a normalized absolute path.");
  const stat = await fs.stat(sourcePath).catch(() => { throw unavailableSource(sourcePath, "does not exist or cannot be accessed."); });
  if (!stat.isFile()) throw unavailableSource(sourcePath, "is not a regular file.");
  await fs.access(sourcePath, constants.R_OK).catch(() => { throw unavailableSource(sourcePath, "is not readable."); });
  const mimeType = contextFileMimeTypeForPath(sourcePath);
  if (!mimeType) throw invalidSource(sourcePath, "has a file type the app does not accept as context.");
  if (stat.size > CONTEXT_FILE_MAX_BYTES) throw tooLarge(sourcePath);
  return { sourcePath, displayName: path.basename(sourcePath), mimeType };
};
export class ProjectTaskContextStore {
  constructor(readonly layout = new ProjectsLayout()) {}
  async begin(projectId: string, taskId?: string): Promise<ProjectTaskDraftManifest> {
    await this.cleanupProjectDrafts(projectId);
    const manifest: ProjectTaskDraftManifest = { projectId, draftId: randomUUID(), ...(taskId ? { taskId } : {}), files: [] };
    await this.lockDraft(projectId, manifest.draftId, async (dir) => { await this.writeManifest(dir, manifest); }, true);
    return manifest;
  }
  async describe(projectId: string, draftId: string): Promise<ProjectTaskDraftManifest> {
    return this.lockDraft(projectId, draftId, (dir) => this.readManifest(dir, projectId, draftId));
  }
  async upload(projectId: string, draftId: string, file: MultipartFile): Promise<ProjectTaskContextFile> {
    return this.lockDraft(projectId, draftId, async (dir) => {
      const manifest = await this.readManifest(dir, projectId, draftId);
      await this.expire(dir, manifest);
      const storedFilename = buildStoredFilename(file.filename, file.mimetype);
      const filePath = this.layout.file(dir, storedFilename);
      let sizeBytes: number;
      try { sizeBytes = await writeContextFileUpload(file, filePath); }
      catch (e) { throw new ProjectError("TASK_CONTEXT_INVALID", e instanceof Error ? e.message : "Upload failed."); }
      const uploaded = { storedFilename, displayName: file.filename, mimeType: file.mimetype, sizeBytes };
      manifest.files.push(uploaded);
      await this.writeManifest(dir, manifest);
      return uploaded;
    });
  }
  async draftFile(projectId: string, draftId: string, filename: string): Promise<{ filePath: string; file: ProjectTaskContextFile }> {
    return this.lockDraft(projectId, draftId, async (dir) => {
      const manifest = await this.readManifest(dir, projectId, draftId);
      await this.expire(dir, manifest);
      const file = manifest.files.find((f) => f.storedFilename === filename) ?? missing();
      const filePath = this.layout.file(dir, filename);
      await this.layout.regular(filePath);
      return { file, filePath };
    });
  }
  async removeDraftFiles(projectId: string, draftId: string, filenames?: string[]): Promise<void> {
    await this.lockDraft(projectId, draftId, async (dir) => {
      const manifest = await this.readManifest(dir, projectId, draftId);
      const removed = filenames ?? manifest.files.map((f) => f.storedFilename);
      for (const name of removed) {
        if (!manifest.files.some((f) => f.storedFilename === name)) missing();
        const filePath = this.layout.file(dir, name);
        await this.layout.regular(filePath).then(() => fs.unlink(filePath)).catch((e) => { if (e.code !== "ENOENT") throw e; });
      }
      manifest.files = manifest.files.filter((f) => !removed.includes(f.storedFilename));
      await this.writeManifest(dir, manifest);
    });
  }
  async discard(projectId: string, draftId: string): Promise<void> {
    await this.lockDraft(projectId, draftId, async (dir) => {
      await this.readManifest(dir, projectId, draftId);
      // Directory/manifest containment has been proved; never follow descendant links.
      await fs.rm(dir, { recursive: true, force: true });
    });
  }
  async prepare(projectId: string, taskId: string, draftId: string | undefined, filenames: string[], existing: boolean): Promise<PreparedTaskContext> {
    if (!filenames.length && !draftId) return { files: [], consumed: [] };
    if (!draftId || new Set(filenames).size !== filenames.length) throw new ProjectError("TASK_CONTEXT_INVALID", "A matching draft and unique filenames are required.");
    return this.lockDraft(projectId, draftId, async (dir) => {
      const manifest = await this.readManifest(dir, projectId, draftId);
      if (manifest.taskId !== (existing ? taskId : undefined)) throw new ProjectError("TASK_CONTEXT_INVALID", "Draft belongs to a different Task.");
      await this.expire(dir, manifest);
      if (!filenames.length) return { files: [], consumed: [] };
      const target = this.layout.contextDir(projectId, taskId);
      await this.layout.directory(target, true);
      const files: ProjectTaskContextFile[] = [];
      for (const name of filenames) {
        const source = manifest.files.find((f) => f.storedFilename === name) ?? missing();
        const sourcePath = this.layout.file(dir, name);
        await this.layout.regular(sourcePath);
        const storedFilename = buildStoredFilename(source.displayName, source.mimeType);
        const targetPath = this.layout.file(target, storedFilename);
        // Immutable exclusive copies are finished before metadata can reference them.
        await fs.copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
        await this.layout.regular(targetPath);
        if ((await fs.stat(targetPath)).size !== source.sizeBytes) throw new ProjectError("TASK_CONTEXT_INVALID", "Context bytes are incomplete.");
        await fs.utimes(targetPath, new Date(), new Date());
        files.push({ ...source, storedFilename });
      }
      return { files, draftId, consumed: filenames };
    });
  }
  /**
   * Copies agent-named node-local files straight into the Task's context (no draft). Every source is
   * validated before any byte is written; if a copy then fails, this call's copies are removed.
   * Sources are only read, never changed. The result is published by the Task metadata save.
   */
  async importLocalFiles(projectId: string, taskId: string, sourcePaths: readonly string[]): Promise<PreparedTaskContext> {
    if (!sourcePaths.length) return { files: [], consumed: [] };
    const duplicate = sourcePaths.find((p, i) => sourcePaths.indexOf(p) !== i);
    if (duplicate !== undefined) throw invalidSource(duplicate, "is listed more than once.");
    const sources: LocalContextSource[] = [];
    for (const sourcePath of sourcePaths) sources.push(await localContextSource(sourcePath));
    const target = this.layout.contextDir(projectId, taskId);
    await this.layout.directory(target, true);
    const files: ProjectTaskContextFile[] = [], written: string[] = [];
    let current = sources[0]!.sourcePath;
    try {
      for (const source of sources) {
        current = source.sourcePath;
        const storedFilename = buildStoredFilename(source.displayName, source.mimeType);
        const targetPath = this.layout.file(target, storedFilename);
        // Immutable exclusive copies are finished before metadata can reference them. A failed copy
        // may leave a partial target; a name collision (EEXIST) is someone else's file.
        await fs.copyFile(source.sourcePath, targetPath, constants.COPYFILE_EXCL).catch(async (e: NodeJS.ErrnoException) => {
          if (e.code !== "EEXIST") await fs.unlink(targetPath).catch(() => undefined);
          throw e;
        });
        written.push(targetPath);
        await this.layout.regular(targetPath);
        // The copied size is authoritative: a source may change between validation and copy.
        const { size } = await fs.stat(targetPath);
        if (size > CONTEXT_FILE_MAX_BYTES) throw tooLarge(source.sourcePath);
        await fs.utimes(targetPath, new Date(), new Date());
        files.push({ storedFilename, displayName: source.displayName, mimeType: source.mimeType, sizeBytes: size });
      }
    } catch (error) {
      for (const filePath of written) await fs.unlink(filePath).catch(() => undefined);
      if (error instanceof ProjectError) throw error;
      throw unavailableSource(current, "could not be copied.");
    }
    return { files, consumed: [] };
  }
  async savedFile(projectId: string, taskId: string, file: ProjectTaskContextFile): Promise<string> {
    const filePath = this.layout.file(this.layout.contextDir(projectId, taskId), file.storedFilename);
    await this.layout.regular(filePath);
    if ((await fs.stat(filePath)).size !== file.sizeBytes) missing();
    await fs.access(filePath, 4);
    return filePath;
  }
  async cleanupRemoved(projectId: string, taskId: string, files: ProjectTaskContextFile[]): Promise<void> {
    for (const file of files) {
      const filePath = this.layout.file(this.layout.contextDir(projectId, taskId), file.storedFilename);
      await this.layout.regular(filePath).then(() => fs.unlink(filePath)).catch((e) => { if (e.code !== "ENOENT") throw e; });
    }
  }
  /** Caller holds the Task metadata lock: this fresh membership proof is the cleanup authority. */
  async reclaimUnpublished(projectId: string, taskId: string, referenced: Set<string>): Promise<void> {
    const dir = this.layout.contextDir(projectId, taskId);
    try { await this.layout.directory(dir); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return; throw e; }
    for (const name of await fs.readdir(dir)) {
      if (referenced.has(name)) continue;
      const filePath = this.layout.file(dir, name);
      await this.layout.regular(filePath);
      if ((await fs.stat(filePath)).mtimeMs < Date.now() - CONTEXT_FILE_DRAFT_TTL_MS) await fs.unlink(filePath);
    }
  }
  private async lockDraft<T>(projectId: string, draftId: string, operation: (dir: string) => Promise<T>, create = false): Promise<T> {
    const dir = this.layout.draftDir(projectId, draftId);
    const parent = path.dirname(dir);
    await this.layout.directory(parent, create);
    // Lock anchor is outside removable draft directory, not the manifest's write lock.
    return withFilePathLock(path.join(parent, `${draftId}.lifecycle`), async () => {
      await this.layout.directory(dir, create);
      return operation(dir);
    });
  }
  private async readManifest(dir: string, projectId: string, draftId: string): Promise<ProjectTaskDraftManifest> {
    const file = path.join(dir, "manifest.json");
    await this.layout.regular(file);
    const manifest = JSON.parse(await fs.readFile(file, "utf8")) as ProjectTaskDraftManifest;
    if (manifest.projectId !== projectId || manifest.draftId !== draftId || !Array.isArray(manifest.files)) missing();
    return manifest;
  }
  private async writeManifest(dir: string, manifest: ProjectTaskDraftManifest): Promise<void> {
    const temporary = path.join(dir, `manifest.${randomUUID()}.tmp`);
    await fs.writeFile(temporary, `${JSON.stringify(manifest)}\n`, { flag: "wx" });
    await fs.rename(temporary, path.join(dir, "manifest.json"));
  }
  private async expire(dir: string, manifest: ProjectTaskDraftManifest): Promise<void> {
    const retained: ProjectTaskContextFile[] = [];
    for (const file of manifest.files) {
      const filePath = this.layout.file(dir, file.storedFilename);
      try {
        await this.layout.regular(filePath);
        if ((await fs.stat(filePath)).mtimeMs < Date.now() - CONTEXT_FILE_DRAFT_TTL_MS) await fs.unlink(filePath);
        else retained.push(file);
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    }
    manifest.files = retained;
    await this.writeManifest(dir, manifest);
  }
  private async cleanupProjectDrafts(projectId: string): Promise<void> {
    const parent = this.layout.draftsDir(projectId);
    await this.layout.directory(parent, true);
    for (const id of await fs.readdir(parent)) {
      if (!this.layout.isDraftId(id)) continue;
      await this.lockDraft(projectId, id, async (dir) => {
        const manifest = await this.readManifest(dir, projectId, id);
        await this.expire(dir, manifest);
        if (!manifest.files.length && (await fs.stat(dir)).birthtimeMs < Date.now() - CONTEXT_FILE_DRAFT_TTL_MS) {
          await fs.rm(dir, { recursive: true, force: true });
        }
      }).catch((e) => { if (e.code !== "ENOENT") console.warn("Task draft cleanup failed.", e); });
    }
  }
}
let singleton: ProjectTaskContextStore | null = null;
export const getProjectTaskContextStore = (): ProjectTaskContextStore => singleton ??= new ProjectTaskContextStore();
export const resetProjectTaskContextStoreForTests = (): void => { singleton = null; };
