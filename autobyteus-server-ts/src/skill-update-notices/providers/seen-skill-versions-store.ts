import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { SeenSkillVersions, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";

export const SEEN_SKILL_VERSIONS_FILE_NAME = "seen_skill_versions.json";

/** A run as far as its seen-versions record is concerned. */
export type SeenSkillVersionsOwner = Readonly<{ runId: string; memoryDir: string | null }>;

type StoredSkill = { skillDir: string; skillMdPath: string; files: Record<string, string> };

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * The per-run record of the skill versions a run was given, at `<memoryDir>/seen_skill_versions.json`
 * (deleted with the run's memory). Runs without a memory folder keep it in memory only.
 * Reads are tolerant: a missing or unreadable record means "none". Writes are atomic.
 */
export class SeenSkillVersionsStore {
  private readonly inMemory = new Map<string, SeenSkillVersions>();

  /** The run's record, or null when it has none (missing, unreadable or invalid). */
  async read(owner: SeenSkillVersionsOwner): Promise<SeenSkillVersions | null> {
    if (!owner.memoryDir) return this.inMemory.get(owner.runId) ?? null;
    const filePath = path.join(owner.memoryDir, SEEN_SKILL_VERSIONS_FILE_NAME);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn(`SEEN_SKILL_VERSIONS_UNREADABLE:${filePath}: ${String(error)}`);
      }
      return null;
    }
    try {
      return parseRecord(JSON.parse(raw));
    } catch (error) {
      logger.warn(`SEEN_SKILL_VERSIONS_INVALID:${filePath}: ${String(error)}`);
      return null;
    }
  }

  async write(owner: SeenSkillVersionsOwner, versions: SeenSkillVersions): Promise<void> {
    if (!owner.memoryDir) {
      this.inMemory.set(owner.runId, new Map(versions));
      return;
    }
    const skills: Record<string, StoredSkill> = {};
    for (const [name, snapshot] of versions) {
      skills[name] = { skillDir: snapshot.skillDir, skillMdPath: snapshot.skillMdPath, files: { ...snapshot.files } };
    }
    await fs.mkdir(owner.memoryDir, { recursive: true });
    const filePath = path.join(owner.memoryDir, SEEN_SKILL_VERSIONS_FILE_NAME);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify({ skills }, null, 2)}\n`, "utf8");
    try {
      await fs.rename(tempPath, filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true });
      throw error;
    }
  }

  /** Forgets an in-memory record (runs without a memory folder); file records stay with the run. */
  forget(owner: SeenSkillVersionsOwner): void {
    if (!owner.memoryDir) this.inMemory.delete(owner.runId);
  }
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const parseRecord = (value: unknown): SeenSkillVersions => {
  const skills = (value as { skills?: unknown } | null)?.skills;
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) throw new Error("'skills' must be an object.");
  const versions = new Map<string, SkillFolderSnapshot>();
  for (const [name, entry] of Object.entries(skills as Record<string, unknown>)) {
    const record = entry as Partial<StoredSkill> | null;
    if (!record || !isString(record.skillDir) || !isString(record.skillMdPath)
      || !record.files || typeof record.files !== "object") {
      throw new Error(`Skill '${name}' is malformed.`);
    }
    const files: Record<string, string> = {};
    for (const [relativePath, digest] of Object.entries(record.files)) {
      if (!isString(digest)) throw new Error(`Skill '${name}' file '${relativePath}' has no digest.`);
      files[relativePath] = digest;
    }
    versions.set(name, Object.freeze({ skillName: name, skillDir: record.skillDir, skillMdPath: record.skillMdPath, files: Object.freeze(files) }));
  }
  return versions;
};
