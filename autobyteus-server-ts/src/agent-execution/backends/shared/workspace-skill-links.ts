import fs from "node:fs/promises";
import path from "node:path";

/** Filesystem operations the workspace skill materializer performs on `<workspace>/<skills root>/<name>`. */
export type WorkspaceSkillFileSystem = Pick<typeof fs,
  "lstat" | "readlink" | "stat" | "realpath" | "mkdir" | "symlink" | "unlink" | "rename">;

export type BrokenSymlinkState = { kind: "broken-symlink"; rawTargetPath: string; resolvedTargetPath: string; device: number; inode: number };

export type WorkspaceSkillPathState =
  | { kind: "missing" }
  | { kind: "same-source-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | BrokenSymlinkState
  | { kind: "live-different-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | { kind: "non-symlink"; pathType: "file" | "directory" | "other" };

/** How an owned link was pointed at a new source: atomically, or (where rename-over is unsupported) by unlink + link. */
export type WorkspaceSkillLinkReplacement = "renamed" | "unlinked-and-linked";

export const isAbsenceError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
};

// Error codes of a rename that cannot replace an existing directory link (Windows directory
// symlinks and junctions). Any other rename failure is a real error.
const RENAME_OVER_UNSUPPORTED_CODES = new Set(["EPERM", "EEXIST", "EACCES", "ENOTEMPTY", "EISDIR"]);

const resolveSymlinkTargetPath = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const pathTypeForStats = (
  stats: Awaited<ReturnType<typeof fs.lstat>>,
): "file" | "directory" | "other" =>
  stats.isFile() ? "file" : stats.isDirectory() ? "directory" : "other";

let replacementSequence = 0;

/**
 * Link-level operations on one workspace skill path. They never decide ownership: the
 * materializer's registry does, and calls these inside its exclusive phases.
 */
export class WorkspaceSkillLinks {
  constructor(private readonly runtimeLabel: string, private readonly fileSystem: WorkspaceSkillFileSystem) {}

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

  /**
   * Points an owned link at `nextSourceRootPath`: a temporary link renamed over the old one. Where
   * renaming over an existing directory link is unsupported (Windows), falls back to unlink + link;
   * the caller's registry phase keeps that sequence exclusive, so a momentary absence is harmless.
   */
  async replaceOwnedLink(materializedRootPath: string, nextSourceRootPath: string): Promise<WorkspaceSkillLinkReplacement> {
    replacementSequence += 1;
    const temporaryPath = `${materializedRootPath}.autobyteus-repoint-${process.pid}-${replacementSequence}`;
    await this.fileSystem.symlink(nextSourceRootPath, temporaryPath, "dir");
    try {
      await this.fileSystem.rename(temporaryPath, materializedRootPath);
      return "renamed";
    } catch (error) {
      await this.unlinkIfPresent(temporaryPath);
      if (!RENAME_OVER_UNSUPPORTED_CODES.has(String((error as NodeJS.ErrnoException)?.code))) throw error;
    }
    await this.unlinkIfPresent(materializedRootPath);
    await this.fileSystem.symlink(nextSourceRootPath, materializedRootPath, "dir");
    return "unlinked-and-linked";
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
