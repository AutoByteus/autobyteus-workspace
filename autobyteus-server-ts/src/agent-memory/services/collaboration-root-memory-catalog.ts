import type {
  MemoryAvailabilityBuildResult,
  MemoryAvailabilitySummary,
  MemoryExplorerPage,
} from "../domain/models.js";
import {
  buildCollaborationMemberMemoryTargets,
  type CollaborationMemberMemoryLocation,
  type CollaborationMemberMemoryTarget,
} from "./collaboration-member-memory-targets.js";
import { mergeMemoryAvailability } from "./memory-run-summary-builder.js";
import {
  includesMemoryExplorerQuery,
  normalizeMemoryExplorerSearch,
  pageMemoryExplorerEntries,
} from "./memory-explorer-page.js";

/** One stored team or org root, read from exactly one execution tree. */
export type CollaborationRootMemoryRecord = Readonly<{
  rootRunId: string;
  definitionId: string;
  definitionName: string;
  createdAt: string | null;
  members: readonly CollaborationMemberMemoryLocation[];
}>;

/** History-sourced facts about one root. */
export type CollaborationRootCatalogEntry = Readonly<{
  definitionName: string | null;
  summary: string | null;
  workspaceRootPath: string | null;
  createdAt: string | null;
}>;

/** Family-specific reader for one persistence family (team or org). */
export interface CollaborationRootMemorySource {
  /** Used in skip/failure warnings, for example "team run". */
  readonly familyLabel: string;
  listRootRunIds(): Promise<string[]>;
  /** Reads one root's tree exactly once. `null` when missing or without members; throws when invalid. */
  readRoot(rootRunId: string): Promise<CollaborationRootMemoryRecord | null>;
  readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>>;
}

export type CollaborationDefinitionMemory = Readonly<{
  definitionId: string;
  definitionName: string;
  runCount: number;
  memberMemoryCount: number;
  memory: MemoryAvailabilitySummary;
}>;

export type CollaborationRootRunMemory = Readonly<{
  rootRunId: string;
  definitionId: string;
  definitionName: string;
  summary: string | null;
  workspaceRootPath: string | null;
  createdAt: string | null;
  memory: MemoryAvailabilityBuildResult;
  members: readonly CollaborationMemberMemoryTarget[];
}>;

type CatalogRun = {
  record: CollaborationRootMemoryRecord;
  entry: CollaborationRootCatalogEntry | null;
  memory: MemoryAvailabilityBuildResult;
  members: CollaborationMemberMemoryTarget[];
};

type CatalogGroup = {
  definitionId: string;
  definitionName: string;
  runs: CatalogRun[];
};

/**
 * Owns memory-explorer catalog policy shared by the team and org families: iteration with one tree
 * read per root, the skip-invalid-root rule, member memory filtering, grouping by definition, name
 * resolution, merged availability, sort order, search matching and paging.
 */
export class CollaborationRootMemoryCatalog {
  constructor(private readonly source: CollaborationRootMemorySource) {}

  async listDefinitions(
    search: string | null | undefined,
    page: number,
    pageSize: number,
  ): Promise<MemoryExplorerPage<CollaborationDefinitionMemory>> {
    const query = normalizeMemoryExplorerSearch(search);
    const groups = this.groupByDefinition(await this.collectRuns());
    const definitions = groups
      .filter((group) => !query || this.groupMatches(group, query))
      .map((group) => this.toDefinition(group))
      .sort(compareDefinitions);
    return pageMemoryExplorerEntries(definitions, page, pageSize);
  }

  async listRuns(
    definitionId: string,
    search: string | null | undefined,
    page: number,
    pageSize: number,
  ): Promise<MemoryExplorerPage<CollaborationRootRunMemory>> {
    const query = normalizeMemoryExplorerSearch(search);
    const runs = (await this.collectRuns(definitionId))
      .filter((run) => !query || this.runMatches(run, query))
      .sort(compareRuns)
      .map(toRootRunMemory);
    return pageMemoryExplorerEntries(runs, page, pageSize);
  }

  private async collectRuns(definitionId?: string): Promise<CatalogRun[]> {
    const entries = await this.readCatalogEntries();
    const runs: CatalogRun[] = [];
    for (const rootRunId of await this.source.listRootRunIds()) {
      const record = await this.safeReadRoot(rootRunId);
      if (!record?.definitionId) continue;
      if (definitionId !== undefined && record.definitionId !== definitionId) continue;
      const members = buildCollaborationMemberMemoryTargets(record.members);
      if (members.length === 0) continue;
      runs.push({
        record,
        entry: entries.get(rootRunId) ?? null,
        memory: mergeMemoryAvailability(members.map((member) => member.memory)),
        members,
      });
    }
    return runs;
  }

  private async safeReadRoot(rootRunId: string): Promise<CollaborationRootMemoryRecord | null> {
    try {
      return await this.source.readRoot(rootRunId);
    } catch (error) {
      console.warn(`Skipping ${this.source.familyLabel} '${rootRunId}' in memory explorer: ${String(error)}`);
      return null;
    }
  }

  private async readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    try {
      return await this.source.readCatalogEntries();
    } catch (error) {
      console.warn(`Failed reading ${this.source.familyLabel} history catalog for memory explorer: ${String(error)}`);
      return new Map();
    }
  }

  private groupByDefinition(runs: readonly CatalogRun[]): CatalogGroup[] {
    const groups = new Map<string, CatalogGroup>();
    for (const run of runs) {
      const { definitionId } = run.record;
      const catalogName = run.entry?.definitionName?.trim();
      let group = groups.get(definitionId);
      if (!group) {
        group = {
          definitionId,
          definitionName: catalogName || run.record.definitionName || definitionId,
          runs: [],
        };
        groups.set(definitionId, group);
      } else if (catalogName && group.definitionName === definitionId) {
        group.definitionName = catalogName;
      }
      group.runs.push(run);
    }
    return Array.from(groups.values());
  }

  private groupMatches(group: CatalogGroup, query: string): boolean {
    return (
      includesMemoryExplorerQuery(group.definitionName, query) ||
      includesMemoryExplorerQuery(group.definitionId, query) ||
      group.runs.some((run) => this.runMatches(run, query))
    );
  }

  private runMatches(run: CatalogRun, query: string): boolean {
    return (
      includesMemoryExplorerQuery(run.record.rootRunId, query) ||
      includesMemoryExplorerQuery(run.record.definitionName, query) ||
      includesMemoryExplorerQuery(run.entry?.summary, query) ||
      includesMemoryExplorerQuery(run.entry?.workspaceRootPath, query) ||
      run.members.some((member) =>
        includesMemoryExplorerQuery(member.displayName, query) ||
        includesMemoryExplorerQuery(member.memberAddress, query) ||
        includesMemoryExplorerQuery(member.agentRunId, query) ||
        includesMemoryExplorerQuery(member.agentDefinitionId, query),
      )
    );
  }

  private toDefinition(group: CatalogGroup): CollaborationDefinitionMemory {
    const merged = mergeMemoryAvailability(group.runs.map((run) => run.memory));
    const memberAddresses = new Set(group.runs.flatMap((run) => run.members.map((member) => member.memberAddress)));
    return {
      definitionId: group.definitionId,
      definitionName: group.definitionName,
      runCount: group.runs.length,
      memberMemoryCount: memberAddresses.size,
      memory: merged.availability,
    };
  }
}

const createdAtOf = (run: CatalogRun): string => run.entry?.createdAt ?? run.record.createdAt ?? "";

const compareDefinitions = (a: CollaborationDefinitionMemory, b: CollaborationDefinitionMemory): number => {
  const timeCompare = (b.memory.latestMemoryAt ?? "").localeCompare(a.memory.latestMemoryAt ?? "");
  if (timeCompare !== 0) {
    return timeCompare;
  }
  return a.definitionName.localeCompare(b.definitionName);
};

const compareRuns = (a: CatalogRun, b: CatalogRun): number => {
  if (a.memory.latestMemoryMtime !== b.memory.latestMemoryMtime) {
    return b.memory.latestMemoryMtime - a.memory.latestMemoryMtime;
  }
  const aCreated = createdAtOf(a);
  const bCreated = createdAtOf(b);
  if (aCreated !== bCreated) {
    return bCreated.localeCompare(aCreated);
  }
  return b.record.rootRunId.localeCompare(a.record.rootRunId);
};

const toRootRunMemory = (run: CatalogRun): CollaborationRootRunMemory => ({
  rootRunId: run.record.rootRunId,
  definitionId: run.record.definitionId,
  definitionName: run.entry?.definitionName ?? run.record.definitionName,
  summary: run.entry?.summary ?? null,
  workspaceRootPath: run.entry?.workspaceRootPath ?? null,
  createdAt: run.entry?.createdAt ?? run.record.createdAt ?? null,
  memory: run.memory,
  members: run.members,
});
