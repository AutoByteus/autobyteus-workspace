import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";
import { GitHubRepositoryClient } from "../../integrations/github/github-repository-client.js";
import { parseGitHubSkillRepository } from "../../integrations/github/github-repository-source.js";
import type { GitHubRepositoryRevisionMetadata } from "../../integrations/github/types.js";
import { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { GitHubSkillSourceStore } from "../stores/github-skill-source-store.js";
import { GitHubSkillRepository } from "../installers/github-skill-repository.js";
import { repositoryKey, repositoryUrl, type GitHubSkillSourceRecord, type SkillSourceInfo,
  type SkillSourceOperationResult } from "../domain/skill-source.js";
import { SkillService } from "./skill-service.js";

type Options = {
  config?: SkillService["config"]; catalog?: SkillService; store?: GitHubSkillSourceStore;
  client?: Pick<GitHubRepositoryClient, "fetchRepositoryRevisionMetadata">;
  repository?: GitHubSkillRepository;
  invalidateWorkspaces?: () => Promise<void>;
  updateSetting?: (key: string, value: string) => [boolean, string];
};

/** Source ownership and publication. Catalog inspection is delegated to the one name-policy owner. */
export class SkillSourceService {
  private static instance: SkillSourceService | null = null;
  static getInstance(): SkillSourceService { return this.instance ??= new SkillSourceService(); }
  static resetInstance(): void { this.instance = null; }
  private readonly config: SkillService["config"];
  private readonly catalog: SkillService;
  private readonly store: GitHubSkillSourceStore;
  private readonly client: NonNullable<Options["client"]>;
  private readonly repository: GitHubSkillRepository;
  private storagePreparation: Promise<void> | null = null;
  private storageWarnings: string[] = [];
  private readonly operations = new Map<string, Promise<unknown>>();

  constructor(private readonly options: Options = {}) {
    this.config = options.config ?? appConfigProvider.config;
    this.store = options.store ?? new GitHubSkillSourceStore(this.config.getAppDataDir());
    this.catalog = options.catalog ?? SkillService.getInstance();
    this.client = options.client ?? new GitHubRepositoryClient();
    this.repository = options.repository ?? new GitHubSkillRepository(this.store.root);
  }

  getRegistryError(): string | null { return this.store.getDiagnostic(); }

  getSkillSources(): SkillSourceInfo[] {
    const sources = [this.config.getSkillsDir(), ...this.config.getAdditionalSkillsDirs()]
      .map((directory, index): SkillSourceInfo => ({
        sourceId: `local:${path.resolve(directory)}`, sourceKind: index === 0 ? "DEFAULT" : "LOCAL_PATH",
        path: directory, skillCount: this.catalog.countSkillsInSource(directory, "skill_path"),
        isDefault: index === 0, github: null,
      }));
    let records: GitHubSkillSourceRecord[];
    try { records = this.store.read(); } catch { return sources; }
    const activePaths = new Set(this.store.listActiveSources().map(source => source.path));
    for (const record of records) {
      const check = record.lastCheck;
      sources.push({
        sourceId: record.id, sourceKind: "GITHUB_REPOSITORY", path: this.store.repositoryPath(record),
        skillCount: record.state === "ACTIVE" && activePaths.has(this.store.repositoryPath(record))
          ? this.catalog.countSkillsInSource(this.store.repositoryPath(record), "github_repository") : 0,
        isDefault: false,
        github: {
          repositoryUrl: repositoryUrl(record.repository), defaultBranch: record.installed.defaultBranch,
          installedRevision: record.installed.revision, latestRevision: check?.latestRevision ?? null,
          latestCheckedAt: check?.checkedAt ?? null,
          status: record.state === "REMOVING" ? "REMOVING" : record.lastUpdateError ? "UPDATE_FAILED"
            : check?.error ? "CHECK_FAILED" : !check?.latestRevision ? "NOT_CHECKED"
              : check.latestRevision === record.installed.revision ? "UP_TO_DATE" : "UPDATE_AVAILABLE",
          lastError: record.lastUpdateError ?? check?.error ?? null,
        },
      });
    }
    return sources;
  }

  addSkillSource(pathStr: string): SkillSourceInfo[] {
    const resolved = this.localPath(pathStr);
    if (!fs.existsSync(resolved)) throw new Error(`Directory not found: ${resolved}`);
    if (!fs.statSync(resolved).isDirectory()) throw new Error(`Path is not a directory: ${resolved}`);
    if (path.resolve(this.config.getSkillsDir()) === resolved) throw new Error("Path is already the default skill directory");
    if (this.config.getAdditionalSkillsDirs().some((entry) => path.resolve(entry) === resolved)) {
      throw new Error("Skill source already exists");
    }
    this.catalog.assertNoIncomingSkillNameConflicts({ path: resolved, layout: "skill_path" });
    const raw = this.config.get("AUTOBYTEUS_SKILLS_PATHS", "");
    this.updateLocalPaths(raw ? `${raw},${resolved}` : resolved);
    return this.getSkillSources();
  }

  removeSkillSource(pathStr: string): SkillSourceInfo[] {
    const resolved = this.localPath(pathStr);
    if (path.resolve(this.config.getSkillsDir()) === resolved) throw new Error("Cannot remove default skill directory");
    const current = this.config.getAdditionalSkillsDirs();
    const remaining = current.filter((entry) => path.resolve(entry) !== resolved);
    if (remaining.length === current.length) throw new Error(`Skill source not found: ${resolved}`);
    this.updateLocalPaths(remaining.join(","));
    return this.getSkillSources();
  }

  importGitHubSkillSource(url: string): Promise<SkillSourceOperationResult> {
    const source = parseGitHubSkillRepository(url);
    return this.serialize(repositoryKey(source), async () => {
      await this.prepareStorage();
      this.store.read();
      const existing = this.store.read().find((record) => repositoryKey(record.repository) === repositoryKey(source));
      if (existing) return this.duplicate(existing);
      const metadata = await this.metadata(source.canonicalUrl);
      const canonicalExisting = this.store.read().find((record) => repositoryKey(record.repository) === repositoryKey(metadata));
      if (canonicalExisting) return this.duplicate(canonicalExisting);
      const id = randomUUID();
      this.store.ensureRoot();
      const prepared = await this.repository.prepare(id, metadata);
      let committed = false;
      try {
        const inspection = this.catalog.inspectSkillSource({ path: prepared.rootPath, layout: "github_repository" });
        if (!inspection.records.length) throw new Error("No valid skills found. Provide a root SKILL.md or a collection of skill folders.");
        // No await: current name check, current registry reread and atomic publication are one turn.
        const records = this.store.read();
        const duplicate = records.find((record) => repositoryKey(record.repository) === repositoryKey(metadata));
        if (duplicate) return this.duplicate(duplicate);
        records.push({ id, repository: { owner: metadata.owner, repo: metadata.repo }, state: "ACTIVE",
          installed: { generation: prepared.generation, revision: metadata.latestRevision, defaultBranch: metadata.defaultBranch },
          lastCheck: this.observation(metadata), lastUpdateError: null });
        this.store.write(records);
        committed = true;
        return await this.afterPublication(id, prepared.generation, inspection.warnings);
      } finally {
        if (!committed) await this.repository.cleanup(id).catch(error => console.warn("Unpublished skill candidate cleanup failed", error));
      }
    });
  }

  async checkGitHubSkillSourceUpdates(sourceIds?: string[] | null): Promise<SkillSourceOperationResult> {
    const records = this.store.read().filter((record) => record.state === "ACTIVE" && (!sourceIds || sourceIds.includes(record.id)));
    await Promise.all(records.map((record) => this.serialize(repositoryKey(record.repository), async () => {
      const current = this.store.read().find((entry) => entry.id === record.id);
      if (!current || current.state !== "ACTIVE") return;
      try {
        const metadata = await this.metadata(repositoryUrl(current.repository));
        this.replaceRecord(current.id, (latest) => ({ ...latest, lastCheck: this.observation(metadata) }));
      } catch (error) {
        this.replaceRecord(current.id, (latest) => ({ ...latest, lastCheck: {
          checkedAt: new Date().toISOString(), latestRevision: latest.lastCheck?.latestRevision ?? null,
          defaultBranch: latest.lastCheck?.defaultBranch ?? null, error: String(error),
        } }));
      }
    })));
    return this.result();
  }

  updateGitHubSkillSource(id: string): Promise<SkillSourceOperationResult> {
    return this.serialize(repositoryKey(this.requireSource(id).repository), async () => {
      await this.prepareStorage();
      const current = this.requireSource(id);
      if (current.state !== "ACTIVE") throw new Error("Removal incomplete. Retry removal before importing or updating this source.");
      let committed = false;
      let generation: string | undefined;
      try {
        const metadata = await this.metadata(repositoryUrl(current.repository));
        if (metadata.latestRevision === current.installed.revision) {
          this.replaceRecord(id, (record) => ({ ...record, lastCheck: this.observation(metadata), lastUpdateError: null }));
          committed = true;
          return await this.afterPublication(id, current.installed.generation, []);
        }
        const prepared = await this.repository.prepare(id, metadata);
        generation = prepared.generation;
        const inspection = this.catalog.inspectSkillSource({ path: prepared.rootPath, layout: "github_repository",
          excludedSourcePath: this.store.repositoryPath(current) });
        if (!inspection.records.length) throw new Error("Update contains no valid skills; previous source retained.");
        this.replaceRecord(id, (record) => ({ ...record,
          installed: { generation: prepared.generation, revision: metadata.latestRevision, defaultBranch: metadata.defaultBranch },
          lastCheck: this.observation(metadata), lastUpdateError: null }));
        committed = true;
        return await this.afterPublication(id, prepared.generation, inspection.warnings);
      } catch (error) {
        if (!committed) {
          try { this.replaceRecord(id, (record) => ({ ...record, lastUpdateError: String(error) })); }
          catch { /* Original publication error remains authoritative. */ }
        }
        throw error;
      } finally {
        if (!committed && generation) await this.repository.cleanup(id, current.installed.generation).catch(error => console.warn("Unpublished skill candidate cleanup failed", error));
      }
    });
  }

  removeGitHubSkillSource(id: string): Promise<SkillSourceOperationResult> {
    return this.serialize(repositoryKey(this.requireSource(id).repository), async () => {
      await this.prepareStorage();
      this.replaceRecord(id, (record) => ({ ...record, state: "REMOVING" }));
      await this.invalidateWorkspaces();
      await this.repository.cleanup(id);
      this.store.write(this.store.read().filter((record) => record.id !== id));
      return this.result();
    });
  }

  private prepareStorage(): Promise<void> {
    if (!this.storagePreparation) {
      const records = this.store.read();
      this.store.ensureRoot();
      // A single initial pass settles before any mutation starts downloading. Never scan or
      // remove a candidate owned by another in-process operation.
      this.storagePreparation = this.repository.cleanupInterruptedImports(new Set(records.map(record => record.id)))
        .catch(error => { this.storageWarnings = [`Interrupted import cleanup incomplete: ${String(error)}`]; });
    }
    return this.storagePreparation;
  }

  private async afterPublication(id: string, generation: string, warnings: string[]): Promise<SkillSourceOperationResult> {
    const notices = [...warnings];
    try { await this.invalidateWorkspaces(); }
    catch (error) { notices.push(`Source committed; file view refresh failed: ${String(error)}`); }
    try { await this.repository.cleanup(id, generation); }
    catch (error) { notices.push(`Source committed; retired file cleanup incomplete: ${String(error)}`); }
    return this.result(notices);
  }
  private invalidateWorkspaces(): Promise<void> {
    return this.options.invalidateWorkspaces?.() ?? WorkspaceManager.getInstance().invalidateStaleSkillWorkspaces();
  }
  private duplicate(record: GitHubSkillSourceRecord): SkillSourceOperationResult {
    if (record.state === "REMOVING") throw new Error("Removal incomplete. Use Retry removal on the existing source.");
    return this.result([`Already imported: ${repositoryUrl(record.repository)}. Use its existing source row.`]);
  }
  private result(warnings: string[] = []): SkillSourceOperationResult { return { sources: this.getSkillSources(), warnings: [...this.storageWarnings, ...warnings] }; }
  private requireSource(id: string): GitHubSkillSourceRecord {
    const record = this.store.read().find((entry) => entry.id === id);
    if (!record) throw new Error("GitHub skill source not found.");
    return record;
  }
  private replaceRecord(id: string, update: (record: GitHubSkillSourceRecord) => GitHubSkillSourceRecord): void {
    const records = this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("GitHub skill source no longer exists.");
    records[index] = update(records[index]!);
    this.store.write(records);
  }
  private observation(metadata: GitHubRepositoryRevisionMetadata): GitHubSkillSourceRecord["lastCheck"] {
    return { checkedAt: new Date().toISOString(), latestRevision: metadata.latestRevision, defaultBranch: metadata.defaultBranch, error: null };
  }
  private async metadata(url: string): Promise<GitHubRepositoryRevisionMetadata> {
    const metadata = await this.client.fetchRepositoryRevisionMetadata(parseGitHubSkillRepository(url));
    parseGitHubSkillRepository(repositoryUrl(metadata));
    if (!/^[a-f0-9]{40,64}$/i.test(metadata.latestRevision)) throw new Error("GitHub returned an invalid revision.");
    return metadata;
  }
  private serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.operations.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.operations.set(key, next);
    void next.finally(() => { if (this.operations.get(key) === next) this.operations.delete(key); }).catch(() => undefined);
    return next;
  }
  private localPath(input: string): string {
    if (/^[a-z]+:\/\//i.test(input)) throw new Error("Use GitHub source import for repository URLs.");
    const resolved = path.resolve(input);
    const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
    const managed = fs.existsSync(this.store.root) ? fs.realpathSync(this.store.root) : path.resolve(this.store.root);
    if (real === managed || real.startsWith(managed + path.sep)) throw new Error("Managed skill sources must be changed through their source ID.");
    return resolved;
  }
  private updateLocalPaths(value: string): void {
    const [success, message] = this.options.updateSetting
      ? this.options.updateSetting("AUTOBYTEUS_SKILLS_PATHS", value)
      : getServerSettingsService().updateSetting("AUTOBYTEUS_SKILLS_PATHS", value);
    if (!success) throw new Error(`Failed to update configuration: ${message}`);
  }
}
