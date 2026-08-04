import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import type { TeamRunIndexRowRecord } from "../store/team-run-history-index-record-types.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";
import { TeamRunMetadataStore } from "../store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../store/team-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { resolveTeamWorkspaceRootPath } from "./team-run-metadata-flattener.js";
import { compactSummary } from "./run-history-service-helpers.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

type CatalogState = {
  initialized: boolean;
  initPromise: Promise<void> | null;
  rows: Map<string, TeamRunIndexRowRecord>;
  queue: Promise<void>;
};

type CatalogMutationResult<T> = {
  value: T;
  shouldFlush: boolean;
};

type TeamRunActivityLookup = {
  getActiveRun(teamRunId: string): unknown | null;
};

const catalogStates = new Map<string, CatalogState>();

const getState = (memoryDir: string): CatalogState => {
  const key = path.resolve(memoryDir);
  const existing = catalogStates.get(key);
  if (existing) {
    return existing;
  }
  const created: CatalogState = {
    initialized: false,
    initPromise: null,
    rows: new Map(),
    queue: Promise.resolve(),
  };
  catalogStates.set(key, created);
  return created;
};

export const resetTeamRunHistoryCatalogState = (memoryDir: string): void => {
  const state = catalogStates.get(path.resolve(memoryDir));
  if (!state) {
    return;
  }
  state.initialized = false;
  state.initPromise = null;
  state.rows = new Map();
};

const normalizeOptionalWorkspaceRootPath = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? canonicalizeWorkspaceRootPath(normalized) : null;
};

const normalizeRow = (row: TeamRunIndexRowRecord): TeamRunIndexRowRecord => ({
  teamRunId: normalizeSafeTeamRunId(row.teamRunId),
  teamDefinitionId: normalizeRequiredString(row.teamDefinitionId, "teamDefinitionId"),
  teamDefinitionName:
    normalizeOptionalString(row.teamDefinitionName) || normalizeRequiredString(row.teamDefinitionId, "teamDefinitionId"),
  workspaceRootPath: normalizeOptionalWorkspaceRootPath(row.workspaceRootPath),
  summary: compactSummary(row.summary),
  createdAt: normalizeRequiredString(row.createdAt, "createdAt"),
  archivedAt: normalizeOptionalString(row.archivedAt),
  terminatedAt: normalizeOptionalString(row.terminatedAt),
});

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

const normalizeSafeTeamRunId = (value: string): string => {
  const teamRunId = value.trim();
  if (
    !teamRunId ||
    path.isAbsolute(teamRunId) ||
    path.posix.isAbsolute(teamRunId) ||
    path.win32.isAbsolute(teamRunId) ||
    /[\\/]/.test(teamRunId) ||
    teamRunId === "." ||
    teamRunId === ".."
  ) {
    throw new Error("teamRunId must be a safe team run identity.");
  }
  return teamRunId;
};

const cloneRows = (
  rows: Map<string, TeamRunIndexRowRecord>,
): Map<string, TeamRunIndexRowRecord> =>
  new Map(Array.from(rows.entries()).map(([teamRunId, row]) => [teamRunId, { ...row }]));

const rowFromMetadata = (
  metadata: TeamRunMetadata,
  existing?: TeamRunIndexRowRecord | null,
  summary?: string | null,
): TeamRunIndexRowRecord => normalizeRow({
  teamRunId: metadata.rootTeam.teamRunId,
  teamDefinitionId: metadata.rootTeam.teamDefinitionId,
  teamDefinitionName: existing?.teamDefinitionName || metadata.teamDefinitionName || metadata.rootTeam.teamDefinitionId,
  workspaceRootPath: existing?.workspaceRootPath ?? resolveTeamWorkspaceRootPath(metadata) ?? null,
  summary: existing?.summary || summary || "",
  createdAt: existing?.createdAt || metadata.createdAt,
  archivedAt: existing?.archivedAt ?? metadata.archivedAt ?? null,
  terminatedAt: existing?.terminatedAt ?? null,
});

export interface TeamCatalogMutationResultMessage {
  success: boolean;
  message: string;
}

export class TeamRunHistoryCatalogService {
  private readonly indexStore: TeamRunHistoryIndexStore;
  private readonly metadataStore: TeamRunMetadataStore;
  private readonly teamRunManager: TeamRunActivityLookup;
  private readonly state: CatalogState;

  constructor(
    private readonly memoryDir: string,
    dependencies: {
      indexStore?: TeamRunHistoryIndexStore;
      metadataStore?: TeamRunMetadataStore;
      teamRunManager?: TeamRunActivityLookup;
    } = {},
  ) {
    this.indexStore = dependencies.indexStore ?? new TeamRunHistoryIndexStore(memoryDir);
    this.metadataStore = dependencies.metadataStore ?? new TeamRunMetadataStore(memoryDir);
    this.teamRunManager = dependencies.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.state = getState(memoryDir);
  }

  async listCatalogRows(): Promise<TeamRunIndexRow[]> {
    await this.ensureInitialized();
    return this.getSortedRows();
  }

  async getCatalogRow(teamRunId: string): Promise<TeamRunIndexRow | null> {
    await this.ensureInitialized();
    return this.state.rows.get(teamRunId.trim()) ?? null;
  }

  async recordTeamRunCreated(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
    summary?: string | null;
  }): Promise<void> {
    await this.enqueue(async () => {
      if (input.metadata.rootTeam.teamRunId !== input.teamRunId) throw new Error("TeamRun metadata root identity mismatch.");
      const row = rowFromMetadata(input.metadata, null, input.summary);
      if (this.state.rows.has(row.teamRunId) || await this.metadataStore.readMetadata(row.teamRunId)) {
        throw new Error(`Team run '${row.teamRunId}' already exists in team history.`);
      }
      await this.metadataStore.writeMetadata(row.teamRunId, input.metadata);
      const stagedRows = cloneRows(this.state.rows);
      stagedRows.set(row.teamRunId, row);
      try {
        await this.flushRows(stagedRows);
        this.state.rows = stagedRows;
      } catch (error) {
        await fs.rm(path.dirname(this.metadataStore.getMetadataPath(row.teamRunId)), {
          recursive: true,
          force: true,
        }).catch(() => undefined);
        throw error;
      }
    });
  }

  async recordTeamRunRestored(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
  }): Promise<void> {
    await this.enqueue(async () => {
      const teamRunId = normalizeSafeTeamRunId(input.teamRunId);
      const previousMetadata = await this.metadataStore.readMetadata(teamRunId);
      if (input.metadata.rootTeam.teamRunId !== teamRunId) throw new Error("TeamRun metadata root identity mismatch.");
      await this.metadataStore.writeMetadata(teamRunId, input.metadata);
      const stagedRows = cloneRows(this.state.rows);
      const current = stagedRows.get(teamRunId) ?? null;
      stagedRows.set(teamRunId, normalizeRow({
        ...rowFromMetadata(input.metadata, current),
        terminatedAt: null,
      }));
      try {
        await this.flushRows(stagedRows);
        this.state.rows = stagedRows;
      } catch (error) {
        if (previousMetadata) {
          await this.metadataStore.writeMetadata(teamRunId, previousMetadata).catch(() => undefined);
        }
        throw error;
      }
    });
  }

  async refreshTeamRunMetadata(input: {
    teamRunId: string;
    metadata: TeamRunMetadata;
  }): Promise<void> {
    await this.enqueue(async () => {
      const teamRunId = normalizeSafeTeamRunId(input.teamRunId);
      const existing = await this.metadataStore.readMetadata(teamRunId);
      if (input.metadata.rootTeam.teamRunId !== teamRunId) throw new Error("TeamRun metadata root identity mismatch.");
      await this.metadataStore.writeMetadata(teamRunId, {
        ...input.metadata,
        teamDefinitionName: existing?.teamDefinitionName ?? input.metadata.teamDefinitionName,
        createdAt: existing?.createdAt ?? input.metadata.createdAt,
        archivedAt: existing?.archivedAt ?? input.metadata.archivedAt ?? null,
      });
    });
  }

  async recordTeamRunSummary(input: { teamRunId: string; summary?: string | null }): Promise<void> {
    const summary = compactSummary(input.summary ?? null);
    if (!summary) {
      return;
    }
    await this.mutate(async (rows) => {
      const teamRunId = normalizeSafeTeamRunId(input.teamRunId);
      const row = rows.get(teamRunId);
      if (!row || row.summary) {
        return { value: undefined, shouldFlush: false };
      }
      rows.set(teamRunId, normalizeRow({ ...row, summary }));
      return { value: undefined, shouldFlush: true };
    });
  }

  async recordTeamRunTerminated(input: { teamRunId: string; terminatedAt?: string }): Promise<void> {
    const terminatedAt = input.terminatedAt ?? new Date().toISOString();
    await this.mutate(async (rows) => {
      const teamRunId = normalizeSafeTeamRunId(input.teamRunId);
      const row = rows.get(teamRunId);
      if (!row || row.terminatedAt === terminatedAt) {
        return { value: undefined, shouldFlush: false };
      }
      rows.set(teamRunId, normalizeRow({ ...row, terminatedAt }));
      return { value: undefined, shouldFlush: true };
    });
  }

  async archiveTeamRun(rawTeamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    return this.setArchiveState(rawTeamRunId, true);
  }

  async unarchiveTeamRun(rawTeamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    return this.setArchiveState(rawTeamRunId, false);
  }

  async deleteTeamRun(rawTeamRunId: string): Promise<TeamCatalogMutationResultMessage> {
    const identity = this.resolveIdentity(rawTeamRunId, { rejectDraftIds: true });
    if (!identity) {
      return { success: false, message: "Invalid team run ID path." };
    }
    if (this.teamRunManager.getActiveRun(identity.teamRunId)) {
      return {
        success: false,
        message: "Team run is active. Terminate it before deleting history.",
      };
    }

    return this.enqueueValue(async () => {
      const stagedRows = cloneRows(this.state.rows);
      const existed = stagedRows.delete(identity.teamRunId);
      if (existed) {
        await this.flushRows(stagedRows);
      }
      this.state.rows = stagedRows;
      try {
        await fs.rm(identity.teamDirPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Team run '${identity.teamRunId}' hidden from catalog but filesystem cleanup failed: ${String(error)}`);
        return {
          success: false,
          message: `Team run '${identity.teamRunId}' was removed from history, but filesystem cleanup failed. Run the history repair script if cleanup is needed.`,
        };
      }
      return { success: true, message: `Team run '${identity.teamRunId}' deleted permanently.` };
    });
  }

  private async setArchiveState(
    rawTeamRunId: string,
    archived: boolean,
  ): Promise<TeamCatalogMutationResultMessage> {
    const identity = this.resolveIdentity(rawTeamRunId, { rejectDraftIds: true });
    if (!identity) {
      return { success: false, message: "Invalid team run ID path." };
    }
    if (this.teamRunManager.getActiveRun(identity.teamRunId)) {
      return {
        success: false,
        message: "Team run is active. Terminate it before archiving history.",
      };
    }

    const verb = archived ? "archived" : "unarchived";
    return this.enqueueValue(async () => {
      const metadata = await this.metadataStore.readMetadata(identity.teamRunId);
      if (!metadata) {
        return {
          success: false,
          message: `Team run metadata not found for '${identity.teamRunId}'.`,
        };
      }
      const previousArchivedAt = metadata.archivedAt ?? null;
      const archivedAt = archived ? previousArchivedAt ?? new Date().toISOString() : null;
      await this.metadataStore.writeMetadata(identity.teamRunId, {
        ...metadata,
        archivedAt,
      });
      const stagedRows = cloneRows(this.state.rows);
      const row = stagedRows.get(identity.teamRunId);
      if (!row) {
        await this.metadataStore.writeMetadata(identity.teamRunId, metadata).catch(() => undefined);
        return {
          success: false,
          message: `Team history row not found for '${identity.teamRunId}'.`,
        };
      }
      stagedRows.set(identity.teamRunId, normalizeRow({ ...row, archivedAt }));
      try {
        await this.flushRows(stagedRows);
        this.state.rows = stagedRows;
      } catch (error) {
        await this.metadataStore.writeMetadata(identity.teamRunId, metadata).catch(() => undefined);
        throw error;
      }
      return { success: true, message: `Team run '${identity.teamRunId}' ${verb}.` };
    });
  }

  private async mutate<T>(
    operation: (
      rows: Map<string, TeamRunIndexRowRecord>,
    ) => Promise<CatalogMutationResult<T>>,
  ): Promise<T> {
    return this.enqueueValue(async () => {
      const stagedRows = cloneRows(this.state.rows);
      const result = await operation(stagedRows);
      if (result.shouldFlush) {
        await this.flushRows(stagedRows);
        this.state.rows = stagedRows;
      }
      return result.value;
    });
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    await this.ensureInitialized();
    const next = this.state.queue.then(operation, operation);
    this.state.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async enqueueValue<T>(operation: () => Promise<T>): Promise<T> {
    let value!: T;
    await this.enqueue(async () => {
      value = await operation();
    });
    return value;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.state.initialized) {
      return;
    }
    if (!this.state.initPromise) {
      this.state.initPromise = this.indexStore.readIndex()
        .then((rows) => {
          this.state.rows = new Map(rows.map((row) => {
            const normalized = normalizeRow(row);
            return [normalized.teamRunId, normalized];
          }));
          this.state.initialized = true;
        })
        .catch((error) => {
          logger.warn(
            `Failed to initialize team run history catalog from index. Run the migration/repair script if history is missing: ${String(error)}`,
          );
          this.state.rows = new Map();
          this.state.initialized = true;
        });
    }
    await this.state.initPromise;
  }

  private getSortedRows(
    rows: Map<string, TeamRunIndexRowRecord> = this.state.rows,
  ): TeamRunIndexRow[] {
    return Array.from(rows.values())
      .map(normalizeRow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async flushRows(rows: Map<string, TeamRunIndexRowRecord>): Promise<void> {
    await this.indexStore.writeIndex(this.getSortedRows(rows));
  }

  private resolveIdentity(
    rawTeamRunId: string,
    options: { rejectDraftIds?: boolean } = {},
  ): { teamRunId: string; teamDirPath: string } | null {
    const teamRunId = rawTeamRunId.trim();
    if (!teamRunId || (options.rejectDraftIds && teamRunId.startsWith("temp-"))) {
      return null;
    }
    try {
      normalizeSafeTeamRunId(teamRunId);
    } catch {
      return null;
    }
    const teamsRoot = path.resolve(this.metadataStore.getTeamDirPath(""));
    const teamDirPath = path.resolve(this.metadataStore.getTeamDirPath(teamRunId));
    if (teamDirPath === teamsRoot || !teamDirPath.startsWith(`${teamsRoot}${path.sep}`)) {
      return null;
    }
    return { teamRunId, teamDirPath };
  }
}

const cachedCatalogServices = new Map<string, TeamRunHistoryCatalogService>();

export const getTeamRunHistoryCatalogService = (): TeamRunHistoryCatalogService => {
  const memoryDir = appConfigProvider.config.getMemoryDir();
  const key = path.resolve(memoryDir);
  const cached = cachedCatalogServices.get(key);
  if (cached) {
    return cached;
  }
  const created = new TeamRunHistoryCatalogService(memoryDir);
  cachedCatalogServices.set(key, created);
  return created;
};
