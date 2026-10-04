import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { writeAtomicJsonSync } from "../../persistence/file/atomic-json-sync.js";
import { isGitHubIdentitySegment } from "../../integrations/github/github-repository-source.js";
import { assertOwnedDirectory, managedRepositoryPath } from "../installers/managed-skill-paths.js";
import { repositoryKey, type GitHubSkillSourceRecord } from "../domain/skill-source.js";
import type { SkillCatalogSource } from "../services/skill-catalog.js";

const segment = z.string().refine(isGitHubIdentitySegment);
const revision = z.string().regex(/^[a-f0-9]{40,64}$/i);
const recordSchema = z.object({
  id: z.string().uuid(),
  repository: z.object({ owner: segment, repo: segment }),
  state: z.enum(["ACTIVE", "REMOVING"]),
  installed: z.object({ generation: z.string().uuid(), revision, defaultBranch: z.string().min(1) }),
  lastCheck: z.object({
    checkedAt: z.string().datetime(), latestRevision: revision.nullable(),
    defaultBranch: z.string().min(1).nullable(), error: z.string().nullable(),
  }).nullable(),
  lastUpdateError: z.string().nullable(),
});

/** Current-field projection only. Invalid registries are never treated as writable empty data. */
export class GitHubSkillSourceStore {
  readonly root: string;
  readonly registryPath: string;
  constructor(readonly appDataDir: string) {
    this.root = path.join(appDataDir, "skill-sources", "github");
    this.registryPath = path.join(this.root, "registry.json");
  }

  ensureRoot(): void {
    assertOwnedDirectory(this.appDataDir, this.root, true);
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
    assertOwnedDirectory(this.appDataDir, this.root);
  }

  read(): GitHubSkillSourceRecord[] {
    assertOwnedDirectory(this.appDataDir, this.root, true);
    try {
      const stat = fs.lstatSync(this.registryPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Unsafe skill source registry.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const records = z.array(recordSchema).parse(JSON.parse(fs.readFileSync(this.registryPath, "utf8")));
    const ids = new Set<string>(), repositories = new Set<string>();
    for (const record of records) {
      const key = repositoryKey(record.repository);
      if (ids.has(record.id) || repositories.has(key)) throw new Error("Duplicate skill source registry identity.");
      ids.add(record.id); repositories.add(key);
    }
    return records;
  }

  write(records: GitHubSkillSourceRecord[]): void {
    this.read(); // admission: never overwrite an unreadable registry
    this.ensureRoot();
    writeAtomicJsonSync(this.registryPath, z.array(recordSchema).parse(records));
  }

  repositoryPath(record: GitHubSkillSourceRecord): string {
    return managedRepositoryPath(this.root, record.id, record.installed.generation);
  }

  listActiveSources(): SkillCatalogSource[] {
    try {
      return this.read().filter((record) => record.state === "ACTIVE").flatMap((record) => {
        const directory = this.repositoryPath(record);
        try { assertOwnedDirectory(this.appDataDir, directory); }
        catch { return []; }
        return [{ path: directory, tier: 3 as const, layout: "github_repository" as const,
          managedSource: { sourceId: record.id, generation: record.installed.generation } }];
      });
    } catch { return []; } // unrelated local catalog remains usable; source snapshot reports the error
  }

  getDiagnostic(): string | null {
    try {
      const records = this.read();
      for (const record of records.filter((entry) => entry.state === "ACTIVE")) {
        assertOwnedDirectory(this.appDataDir, this.repositoryPath(record));
      }
      return null;
    } catch (error) { return `GitHub skill sources unavailable: ${String(error)}`; }
  }
}
