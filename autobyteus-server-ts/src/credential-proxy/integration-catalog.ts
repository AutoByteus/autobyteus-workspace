import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GitHubSkillSourceInfo, SkillSourceChangeObserver } from "../skills/domain/skill-source.js";
import { SkillService } from "../skills/services/skill-service.js";
import { SkillSourceService } from "../skills/services/skill-source-service.js";
import { DeliveryDefinitions } from "./delivery-definitions.js";
import { getIntegrationConnectionService, type IntegrationConnectionService } from "./integration-connection-service.js";
import {
  classifyImportLocation,
  importOutcomeError,
  IntegrationCatalogError,
  sourceChangeError,
  type IntegrationSourceKind,
} from "./integration-import-outcomes.js";
import { parseIntegrationSource, warnOnce, type IntegrationManifestEntry } from "./integration-manifest.js";
import { checkTools, type ToolCheck } from "./tool-presence.js";

/** An imported skill source an integration can come from: a local folder or an ACTIVE GitHub repository. */
export type IntegrationSource = Readonly<{
  sourceId: string;
  kind: IntegrationSourceKind;
  /** `owner/repository`, or the folder path. */
  label: string;
  /** The repository link, or the folder path. */
  location: string;
  /** The source's current root (a GitHub source's root changes with each update). */
  rootPath: string;
  skillCount: number;
  github: GitHubSkillSourceInfo | null;
}>;

export type IntegrationEntry = IntegrationManifestEntry & Readonly<{ source: IntegrationSource }>;

export type IntegrationState = "NEEDS_TOKEN" | "CONNECTED" | "NEEDS_NEWER_APP";

/** An entry as the Integrations page shows it. */
export type IntegrationListing = IntegrationEntry & Readonly<{
  state: IntegrationState;
  login: string | null;
  connectedAt: string | null;
  tools: readonly ToolCheck[];
}>;

/** A source that holds integrations, with the integrations this page shows from it. */
export type IntegrationSourceListing = IntegrationSource & Readonly<{
  integrations: readonly Readonly<{ id: string; name: string }>[];
}>;

type SkillSources = Pick<SkillSourceService,
  "getSkillSources" | "isSourceRegistered" | "addSkillSource" | "removeSkillSource"
  | "importGitHubSkillSource" | "updateGitHubSkillSource" | "removeGitHubSkillSource">;
type Connections = Pick<IntegrationConnectionService, "status" | "disconnect">;

const resolveReal = (target: string): string => {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
};
const samePath = (a: string, b: string): boolean => resolveReal(a) === resolveReal(b);

const repositoryLabel = (repositoryUrl: string): string => repositoryUrl.replace(/^https:\/\/github\.com\//i, "");

/**
 * The integrations in the imported skill sources (DS-001), and the page's import, update and removal of those
 * sources (DS-002, DS-005). Reads the sources from disk on every call (no cache to invalidate); needs no network. The
 * only integrations caller of `SkillSourceService`, and its source-change observer: before a source is removed, or
 * an update drops an integration, it disconnects that integration (DEC-015, DEC-016).
 */
export class IntegrationCatalog implements SkillSourceChangeObserver {
  constructor(private readonly deps: Readonly<{
    skillSources: SkillSources;
    skills: Pick<SkillService, "listCatalogSourcePaths">;
    connections: Connections;
    definitions: DeliveryDefinitions;
    tools?: (tools: readonly string[]) => ToolCheck[];
    homeDir?: () => string;
  }>) {}

  /** The sources integrations can come from, in the skill catalog's source precedence (AR-008). */
  private sources(): IntegrationSource[] {
    const precedence = this.deps.skills.listCatalogSourcePaths();
    const rank = (rootPath: string): number => {
      const index = precedence.findIndex((entry) => samePath(entry, rootPath));
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return this.deps.skillSources.getSkillSources()
      .flatMap((source): IntegrationSource[] => {
        if (source.sourceKind === "LOCAL_PATH") {
          return [{ sourceId: source.sourceId, kind: "LOCAL_PATH", label: source.path, location: source.path,
            rootPath: source.path, skillCount: source.skillCount, github: null }];
        }
        if (source.sourceKind === "GITHUB_REPOSITORY" && source.github && source.github.status !== "REMOVING") {
          return [{ sourceId: source.sourceId, kind: "GITHUB_REPOSITORY", label: repositoryLabel(source.github.repositoryUrl),
            location: source.github.repositoryUrl, rootPath: source.path, skillCount: source.skillCount, github: source.github }];
        }
        return [];
      })
      .map((source, index) => ({ source, index, rank: rank(source.rootPath) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ source }) => source);
  }

  /**
   * Every valid integration per source, and the kept entry per ID: the one from the source first in precedence. A
   * second source with the same ID (only possible through a Skills-page import, DEC-017) is skipped with a warning.
   */
  private scan(): { kept: IntegrationEntry[]; parsedBySource: Map<string, IntegrationEntry[]>; sources: IntegrationSource[] } {
    const sources = this.sources();
    const kept = new Map<string, IntegrationEntry>();
    const parsedBySource = new Map<string, IntegrationEntry[]>();
    for (const source of sources) {
      const parsed = parseIntegrationSource(source.rootPath).map((entry): IntegrationEntry => Object.freeze({ ...entry, source }));
      parsedBySource.set(source.sourceId, parsed);
      for (const entry of parsed) {
        const existing = kept.get(entry.id);
        if (existing) {
          warnOnce(`Integration '${entry.id}' in ${source.label} is skipped: ${existing.source.label} already has an integration with this ID.`);
          continue;
        }
        kept.set(entry.id, entry);
      }
    }
    return { kept: [...kept.values()].sort((a, b) => a.name.localeCompare(b.name)), parsedBySource, sources };
  }

  /** The kept integration entries, sorted by name (DEC-008). */
  entries(): IntegrationEntry[] {
    return this.scan().kept;
  }

  /** The cards: each entry with its state, login and tools. No network. */
  async list(): Promise<IntegrationListing[]> {
    return Promise.all(this.entries().map((entry) => this.toListing(entry)));
  }

  /** The sources that hold integrations, for Manage sources. */
  sourceListings(): IntegrationSourceListing[] {
    const { kept, parsedBySource, sources } = this.scan();
    return sources
      .filter((source) => (parsedBySource.get(source.sourceId) ?? []).length > 0)
      .map((source) => Object.freeze({
        ...source,
        integrations: kept.filter((entry) => entry.source.sourceId === source.sourceId)
          .map((entry) => Object.freeze({ id: entry.id, name: entry.name })),
      }));
  }

  /** Name and skill of an integration, for the proxy's refusal texts; null when it is no longer imported. */
  describe(integrationId: string): Readonly<{ name: string; skillName: string }> | null {
    const entry = this.entries().find((candidate) => candidate.id === integrationId);
    return entry ? { name: entry.name, skillName: entry.skillName } : null;
  }

  /** Per integration folder (real path), its integration ID: for the Skills page's "Integration" label. */
  integrationIdsBySkillRoot(): ReadonlyMap<string, string> {
    return new Map(this.entries().map((entry) => [resolveReal(entry.folderPath), entry.id]));
  }

  /** Whether a run's recorded source is still registered (cheap; for every proxied call). */
  isSourceRegistered(sourceId: string): boolean {
    return this.deps.skillSources.isSourceRegistered(sourceId);
  }

  /**
   * Imports a GitHub repository link or a folder path as a skill source that must hold an integration (DS-002), and
   * returns only the newly imported integrations. Every outcome is classified here (the design's mapping table).
   */
  async import(location: string): Promise<IntegrationListing[]> {
    const target = classifyImportLocation(location, this.deps.homeDir ?? os.homedir);
    const before = this.entries();
    const requireIntegrationFolder = { reservedIds: before.map((entry) => entry.id) };
    try {
      if (target.kind === "GITHUB_REPOSITORY") {
        const result = await this.deps.skillSources.importGitHubSkillSource(target.url, { requireIntegrationFolder });
        if (result.alreadyImported) {
          throw new IntegrationCatalogError("ALREADY_IMPORTED", "This repository is already imported.", { kind: target.kind });
        }
      } else {
        await this.deps.skillSources.addSkillSource(target.path, { requireIntegrationFolder });
      }
    } catch (error) {
      throw importOutcomeError(error, target.kind, (id) => before.find((entry) => entry.id === id)?.source.label ?? null);
    }
    const known = new Set(before.map((entry) => entry.id));
    return Promise.all(this.entries().filter((entry) => !known.has(entry.id)).map((entry) => this.toListing(entry)));
  }

  /** Updates a GitHub source to its latest revision (the update drops nothing silently: DEC-016 via the observer). */
  async updateSource(sourceId: string): Promise<IntegrationSourceListing[]> {
    const source = this.requireSource(sourceId);
    if (source.kind !== "GITHUB_REPOSITORY") {
      throw new IntegrationCatalogError("SOURCE_NOT_FOUND", "Only a GitHub source can be updated.");
    }
    try {
      await this.deps.skillSources.updateGitHubSkillSource(sourceId);
    } catch (error) {
      throw sourceChangeError(error, "UPDATE_FAILED", true);
    }
    return this.sourceListings();
  }

  /**
   * Removes a source and its skills (a folder's files stay, DEC-014); the observer disconnects its integrations
   * first. Returns the names of the integrations whose connection went with it.
   */
  async removeSource(sourceId: string): Promise<string[]> {
    const source = this.requireSource(sourceId);
    const removedConnections: string[] = [];
    for (const entry of this.entries().filter((candidate) => candidate.source.sourceId === sourceId)) {
      if ((await this.deps.connections.status(entry.id)).connected) removedConnections.push(entry.name);
    }
    try {
      if (source.kind === "LOCAL_PATH") await this.deps.skillSources.removeSkillSource(source.location);
      else await this.deps.skillSources.removeGitHubSkillSource(sourceId);
    } catch (error) {
      throw sourceChangeError(error, "REMOVE_FAILED", false);
    }
    return removedConnections;
  }

  /** Before a source is removed (from either page): disconnect the integrations whose kept entry is in it. */
  async sourceRemoving(rootPath: string): Promise<void> {
    const ids = this.entries().filter((entry) => samePath(entry.source.rootPath, rootPath)).map((entry) => entry.id);
    await this.disconnectConnected(ids);
  }

  /** Before a GitHub update is published: disconnect the integrations it drops (in the old root, not in the new one). */
  async sourceChanging(oldRoot: string, newRoot: string): Promise<void> {
    const remaining = new Set(parseIntegrationSource(newRoot).map((entry) => entry.id));
    const dropped = this.entries()
      .filter((entry) => samePath(entry.source.rootPath, oldRoot) && !remaining.has(entry.id))
      .map((entry) => entry.id);
    await this.disconnectConnected(dropped);
  }

  private async disconnectConnected(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      if ((await this.deps.connections.status(id)).connected) await this.deps.connections.disconnect(id);
    }
  }

  private async toListing(entry: IntegrationEntry): Promise<IntegrationListing> {
    const tools = (this.deps.tools ?? checkTools)(entry.prerequisites);
    if (!this.deps.definitions.get(entry.id)) {
      return Object.freeze({ ...entry, state: "NEEDS_NEWER_APP", login: null, connectedAt: null, tools });
    }
    const status = await this.deps.connections.status(entry.id);
    return Object.freeze({
      ...entry,
      state: status.connected ? "CONNECTED" : "NEEDS_TOKEN",
      login: status.login,
      connectedAt: status.connectedAt,
      tools,
    });
  }

  private requireSource(sourceId: string): IntegrationSource {
    const source = this.sources().find((candidate) => candidate.sourceId === sourceId);
    if (!source) throw new IntegrationCatalogError("SOURCE_NOT_FOUND", "This source is not imported.");
    return source;
  }
}

let catalog: IntegrationCatalog | null = null;

/** The node's integration catalog over its skill sources, skills and connections. */
export const getIntegrationCatalog = (): IntegrationCatalog => {
  catalog ??= new IntegrationCatalog({
    skillSources: SkillSourceService.getInstance(),
    skills: SkillService.getInstance(),
    connections: getIntegrationConnectionService(),
    definitions: new DeliveryDefinitions(),
  });
  return catalog;
};
