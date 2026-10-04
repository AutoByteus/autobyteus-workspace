import syncFs from "node:fs";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Filesystem operations the workspace skill materializer performs on `<workspace>/<skills root>/<name>`. */
export type WorkspaceSkillFileSystem = Pick<typeof fs,
  "lstat" | "readlink" | "stat" | "realpath" | "mkdir" | "symlink" | "unlink">;

export type WorkspaceSkillSyncFileSystem = Pick<typeof syncFs,
  "lstatSync" | "readlinkSync" | "realpathSync" | "statSync" | "symlinkSync" | "renameSync" | "unlinkSync">;

export type BrokenSymlinkState = { kind: "broken-symlink"; rawTargetPath: string; resolvedTargetPath: string; device: number; inode: number };

export type WorkspaceSkillPathState =
  | { kind: "missing" }
  | { kind: "same-source-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | BrokenSymlinkState
  | { kind: "live-different-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | { kind: "non-symlink"; pathType: "file" | "directory" | "other" };

export const isAbsenceError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
};

const resolveSymlinkTargetPath = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const pathTypeForStats = (
  stats: Awaited<ReturnType<typeof fs.lstat>>,
): "file" | "directory" | "other" =>
  stats.isFile() ? "file" : stats.isDirectory() ? "directory" : "other";

/**
 * Link-level operations on one workspace skill path. They never decide ownership: the
 * materializer's registry does, and calls these inside its exclusive phases.
 */
export class WorkspaceSkillLinks {
  constructor(private readonly runtimeLabel: string, private readonly fileSystem: WorkspaceSkillFileSystem,
    private readonly sync: WorkspaceSkillSyncFileSystem = syncFs) {}

  async hasValidSkillManifest(sourceRootPath: string): Promise<boolean> {
    try {
      const stats = await this.fileSystem.stat(path.join(sourceRootPath, "SKILL.md"));
      return stats.isFile();
    } catch (error) {
      if (isAbsenceError(error)) return false;
      throw error;
    }
  }

  async inspectPath(materializedRootPath: string, sourceRootPath: string | null): Promise<WorkspaceSkillPathState> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return { kind: "missing" };
      throw error;
    }
    if (!stats.isSymbolicLink()) {
      return { kind: "non-symlink", pathType: pathTypeForStats(stats) };
    }
    const rawTargetPath = await this.fileSystem.readlink(materializedRootPath);
    const resolvedTargetPath = resolveSymlinkTargetPath(materializedRootPath, rawTargetPath);
    try {
      await this.fileSystem.stat(resolvedTargetPath);
    } catch (error) {
      if (isAbsenceError(error)) {
        return { kind: "broken-symlink", rawTargetPath, resolvedTargetPath, device: stats.dev, inode: stats.ino };
      }
      throw error;
    }
    if (sourceRootPath && await this.pathsReferToSameTarget(resolvedTargetPath, sourceRootPath)) {
      return { kind: "same-source-symlink", rawTargetPath, resolvedTargetPath };
    }
    return { kind: "live-different-symlink", rawTargetPath, resolvedTargetPath };
  }

  async unlinkBrokenLinkIfStillMatching(materializedRootPath: string, expected: BrokenSymlinkState): Promise<boolean> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return true;
      throw error;
    }
    if (!stats.isSymbolicLink() || stats.dev !== expected.device || stats.ino !== expected.inode) {
      return false;
    }
    const rawTargetPath = await this.fileSystem.readlink(materializedRootPath);
    if (rawTargetPath !== expected.rawTargetPath) return false;
    try {
      await this.fileSystem.stat(expected.resolvedTargetPath);
      return false;
    } catch (error) {
      if (!isAbsenceError(error)) throw error;
    }
    await this.unlinkIfPresent(materializedRootPath);
    return true;
  }

  async createOrAcceptSameSourceLink(materializedRootPath: string, sourceRootPath: string, skillName: string): Promise<void> {
    await this.fileSystem.mkdir(path.dirname(materializedRootPath), { recursive: true });
    try {
      await this.fileSystem.symlink(sourceRootPath, materializedRootPath, "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      const state = await this.inspectPath(materializedRootPath, sourceRootPath);
      if (state.kind === "same-source-symlink") return;
      throw this.pathStateCollisionError(skillName, materializedRootPath, sourceRootPath, state);
    }
  }

  /** Removes the link only while it still points at `sourceRootPath` (never a replacement or user entry). */
  async removeLinkToSource(materializedRootPath: string, sourceRootPath: string): Promise<void> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return;
      throw error;
    }
    if (!stats.isSymbolicLink()) return;
    const rawTargetPath = await this.fileSystem.readlink(materializedRootPath);
    const resolvedTargetPath = resolveSymlinkTargetPath(materializedRootPath, rawTargetPath);
    if (!(await this.pathsReferToSameTarget(resolvedTargetPath, sourceRootPath))) return;
    await this.unlinkIfPresent(materializedRootPath);
  }

  /** Exclusive, no-await managed-generation publication. No unowned entry is ever replaced. */
  replaceOwnedLinkSync(destination: string, previous: string | null, current: string,
    name: string, claim: boolean): boolean {
    if (!this.sync.statSync(path.join(current, "SKILL.md")).isFile()) throw new Error("Current skill manifest is unavailable.");
    const same = (left: string, right: string) => {
      if (path.resolve(left) === path.resolve(right)) return true;
      try { return this.sync.realpathSync(left) === this.sync.realpathSync(right); }
      catch (error) { if (isAbsenceError(error)) return false; throw error; }
    };
    const inspect = () => {
      try {
        const stats = this.sync.lstatSync(destination);
        if (!stats.isSymbolicLink()) throw this.sourceCollisionError(name, destination, "workspace-owned entry", current);
        const raw = this.sync.readlinkSync(destination);
        const target = resolveSymlinkTargetPath(destination, raw);
        let broken = false;
        try { this.sync.statSync(target); } catch (error) {
          if (!isAbsenceError(error)) throw error;
          broken = true;
        }
        if (!same(target, current) && (!previous || !same(target, previous)) && !(!previous && broken)) {
          throw this.sourceCollisionError(name, destination, target, current);
        }
        return { raw, stats, target, broken };
      } catch (error) { if (isAbsenceError(error)) return null; throw error; }
    };
    const old = inspect();
    if (!claim && !old?.broken) return false;
    if (old && same(old.target, current)) return true;
    const temporary = path.join(path.dirname(destination), `.skill-link-${randomUUID()}`);
    this.sync.symlinkSync(current, temporary, "dir");
    try {
      const final = inspect();
      if (Boolean(final) !== Boolean(old) || (final && old &&
          (final.raw !== old.raw || final.stats.dev !== old.stats.dev || final.stats.ino !== old.stats.ino))) {
        throw new Error("Workspace skill link changed during transfer.");
      }
      if (!old) {
        // symlink is exclusive, unlike rename onto an absent path observed earlier.
        this.sync.symlinkSync(current, destination, "dir");
      } else {
        try { this.sync.renameSync(temporary, destination); }
        catch (error) {
          // Windows may not replace a directory symlink by rename. Re-prove ownership.
          if (process.platform !== "win32" || !["EEXIST", "EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
          const retry = inspect();
          if (!retry || retry.raw !== old.raw || retry.stats.ino !== old.stats.ino || retry.stats.dev !== old.stats.dev) throw error;
          this.sync.unlinkSync(destination);
          try { this.sync.symlinkSync(current, destination, "dir"); }
          catch (createError) {
            try {
              this.sync.lstatSync(destination);
            } catch (absent) {
              if (isAbsenceError(absent)) {
                try { this.sync.symlinkSync(old.raw, destination, "dir"); } catch { /* owned entry remains retryable */ }
              }
            }
            throw createError;
          }
        }
      }
      return true;
    } finally {
      try { this.sync.unlinkSync(temporary); } catch (error) { if (!isAbsenceError(error)) console.warn(error); }
    }
  }

  sourceCollisionError(skillName: string, materializedRootPath: string, existingSource: string, requestedSource: string): Error {
    return new Error(
      `Workspace skill path collision for ${this.runtimeLabel} skill '${skillName}': path '${materializedRootPath}' is being materialized from '${existingSource}' instead of '${requestedSource}'.`,
    );
  }

  pathStateCollisionError(
    skillName: string,
    materializedRootPath: string,
    sourceRootPath: string | null,
    state: WorkspaceSkillPathState,
  ): Error {
    const detail = state.kind === "live-different-symlink"
      ? `already points to live target '${state.resolvedTargetPath}'${sourceRootPath ? ` instead of '${sourceRootPath}'` : ""}`
      : state.kind === "non-symlink"
        ? `already exists as a ${state.pathType}`
        : state.kind === "broken-symlink"
          ? `is a broken symlink to '${state.resolvedTargetPath}'`
          : state.kind === "missing"
            ? "changed during an exclusive link creation"
            : `already points to the configured source but is not owned by this request`;
    return new Error(
      `Workspace skill path collision for ${this.runtimeLabel} skill '${skillName}': path '${materializedRootPath}' ${detail}.`,
    );
  }

  private async pathsReferToSameTarget(leftPath: string, rightPath: string): Promise<boolean> {
    if (path.resolve(leftPath) === path.resolve(rightPath)) return true;
    try {
      const [leftRealPath, rightRealPath] = await Promise.all([
        this.fileSystem.realpath(leftPath),
        this.fileSystem.realpath(rightPath),
      ]);
      return leftRealPath === rightRealPath;
    } catch (error) {
      if (isAbsenceError(error)) return false;
      throw error;
    }
  }

  private async unlinkIfPresent(targetPath: string): Promise<void> {
    try {
      await this.fileSystem.unlink(targetPath);
    } catch (error) {
      if (!isAbsenceError(error)) throw error;
    }
  }
}
