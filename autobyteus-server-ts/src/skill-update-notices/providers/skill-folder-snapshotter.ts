import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedSkill, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";
import { SkillFolderIgnore } from "./skill-folder-ignore.js";

type CachedDigest = { size: number; mtimeMs: number; digest: string };

/**
 * Lists a skill folder's files (minus ignored ones) with SHA-256 digests by relative path.
 * Content-identical writes produce identical snapshots. Files whose size and mtime did not
 * change are not re-hashed. Symlinked folders inside a skill are not followed.
 */
export class SkillFolderSnapshotter {
  private readonly digests = new Map<string, CachedDigest>();

  /** The skill's snapshot, or null when its folder cannot be read (deleted or replaced mid-read). */
  async snapshot(skill: ResolvedSkill): Promise<SkillFolderSnapshot | null> {
    const skillDir = path.resolve(skill.rootPath);
    const ignore = new SkillFolderIgnore(skillDir);
    const files: Record<string, string> = {};
    try {
      await this.collect(skillDir, skillDir, ignore, files);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    const ordered = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
    return Object.freeze({
      skillName: skill.name,
      skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      files: Object.freeze(ordered),
    });
  }

  private async collect(
    skillDir: string,
    directory: string,
    ignore: SkillFolderIgnore,
    files: Record<string, string>,
  ): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignore.ignores(absolute, true)) await this.collect(skillDir, absolute, ignore, files);
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      if (ignore.ignores(absolute, false)) continue;
      const digest = await this.digestOf(absolute);
      if (digest) files[path.relative(skillDir, absolute).split(path.sep).join("/")] = digest;
    }
  }

  /** The file's digest; null for a symlink to a folder or a file that vanished meanwhile. */
  private async digestOf(filePath: string): Promise<string | null> {
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    if (!stats.isFile()) return null;
    const cached = this.digests.get(filePath);
    if (cached && cached.size === stats.size && cached.mtimeMs === stats.mtimeMs) return cached.digest;
    let content: Buffer;
    try {
      content = await fs.readFile(filePath);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    const digest = createHash("sha256").update(content).digest("hex");
    this.digests.set(filePath, { size: stats.size, mtimeMs: stats.mtimeMs, digest });
    return digest;
  }
}

const isMissing = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
};
