import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { GitHubRepositoryClient } from "../../integrations/github/github-repository-client.js";
import type { GitHubRepositoryRevisionMetadata } from "../../integrations/github/types.js";
import { assertOwnedDirectory, isManagedId, managedRepositoryPath } from "./managed-skill-paths.js";
import { extractSkillRepositoryArchive } from "./skill-repository-archive.js";

export type PreparedSkillRepository = { generation: string; rootPath: string };

/** Owns repository bytes, never catalog activation. All destructive paths derive from UUIDs. */
export class GitHubSkillRepository {
  constructor(readonly root: string, private readonly client: Pick<GitHubRepositoryClient, "downloadArchive">) {}

  /** Called once before this process starts preparing candidates. Interrupted, unpublished
   * imports have no registry row; inspect only this owner's UUID directories/staging. */
  async cleanupInterruptedImports(registeredIds: ReadonlySet<string>): Promise<void> {
    assertOwnedDirectory(this.root, this.root);
    const orphanIds = new Set(fs.readdirSync(this.root).filter(name => isManagedId(name) && !registeredIds.has(name)));
    const staging = path.join(this.root, ".staging");
    assertOwnedDirectory(this.root, staging, true);
    if (fs.existsSync(staging)) for (const name of fs.readdirSync(staging)) {
      const id = name.slice(0, 36);
      if (isManagedId(id) && name[36] === "-" && !registeredIds.has(id)) orphanIds.add(id);
    }
    for (const id of orphanIds) await this.cleanup(id);
  }

  async prepare(id: string, metadata: GitHubRepositoryRevisionMetadata): Promise<PreparedSkillRepository> {
    const generation = randomUUID();
    const destination = managedRepositoryPath(this.root, id, generation);
    assertOwnedDirectory(this.root, path.dirname(destination), true);
    const stagingParent = path.join(this.root, ".staging");
    assertOwnedDirectory(this.root, stagingParent, true);
    fs.mkdirSync(stagingParent, { recursive: true, mode: 0o700 });
    const staging = fs.mkdtempSync(path.join(stagingParent, `${id}-`));
    try {
      const archive = path.join(staging, "repository.tar.gz");
      await this.client.downloadArchive(metadata.owner, metadata.repo, metadata.latestRevision, archive);
      assertOwnedDirectory(this.root, staging);
      const output = path.join(staging, "extracted");
      fs.mkdirSync(output, { mode: 0o700 });
      const extracted = await extractSkillRepositoryArchive(archive, output, this.root);
      assertOwnedDirectory(this.root, extracted);
      assertOwnedDirectory(this.root, path.dirname(destination), true);
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      fs.renameSync(extracted, destination);
      return { generation, rootPath: destination };
    } finally {
      assertOwnedDirectory(this.root, staging);
      await fsp.rm(staging, { recursive: true });
    }
  }

  async cleanup(id: string, keepGeneration?: string): Promise<void> {
    if (!isManagedId(id)) throw new Error("Invalid managed source identity.");
    const source = path.join(this.root, id);
    assertOwnedDirectory(this.root, source, true);
    if (fs.existsSync(source)) {
      const generations = path.join(source, "generations");
      assertOwnedDirectory(this.root, generations, true);
      if (fs.existsSync(generations)) {
        for (const name of fs.readdirSync(generations)) {
          if (!isManagedId(name) || name === keepGeneration) continue;
          const target = path.join(generations, name);
          assertOwnedDirectory(this.root, target);
          await fsp.rm(target, { recursive: true });
        }
      }
      if (!keepGeneration) {
        assertOwnedDirectory(this.root, source);
        await fsp.rm(source, { recursive: true });
      }
    }
    const staging = path.join(this.root, ".staging");
    assertOwnedDirectory(this.root, staging, true);
    if (fs.existsSync(staging)) for (const name of fs.readdirSync(staging)) {
      if (!name.startsWith(id + "-")) continue;
      const target = path.join(staging, name);
      assertOwnedDirectory(this.root, target);
      await fsp.rm(target, { recursive: true });
    }
  }
}
