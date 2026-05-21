import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunHistoryIndexRow } from "../domain/agent-run-history-index-types.js";
import type { AgentRunHistoryIndexRowRecord } from "../store/agent-run-history-index-record-types.js";
import { AgentRunHistoryIndexStore } from "../store/agent-run-history-index-store.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { AgentRunHistoryIdentityResolver } from "./agent-run-history-identity.js";
import { compactSummary } from "./run-history-service-helpers.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

type CatalogState = {
  initialized: boolean;
  initPromise: Promise<void> | null;
  rows: Map<string, AgentRunHistoryIndexRowRecord>;
  queue: Promise<void>;
};

type CatalogMutationResult<T> = {
  value: T;
  shouldFlush: boolean;
};

type AgentDefinitionLookup = {
  getAgentDefinitionById(
    agentDefinitionId: string,
  ): Promise<{ name?: string | null } | null>;
};

type AgentRunActivityLookup = {
  hasActiveRun(runId: string): boolean | Promise<boolean>;
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

export const resetAgentRunHistoryCatalogState = (memoryDir: string): void => {
  const state = catalogStates.get(path.resolve(memoryDir));
  if (!state) {
    return;
  }
  state.initialized = false;
  state.initPromise = null;
  state.rows = new Map();
};

const normalizeRow = (
  row: AgentRunHistoryIndexRowRecord,
): AgentRunHistoryIndexRowRecord => ({
  runId: row.runId.trim(),
  agentDefinitionId: row.agentDefinitionId.trim(),
  agentName: row.agentName.trim() || row.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
  summary: compactSummary(row.summary),
  createdAt: row.createdAt,
  archivedAt: row.archivedAt ?? null,
  terminatedAt: row.terminatedAt ?? null,
});

const cloneRows = (
  rows: Map<string, AgentRunHistoryIndexRowRecord>,
): Map<string, AgentRunHistoryIndexRowRecord> =>
  new Map(Array.from(rows.entries()).map(([runId, row]) => [runId, { ...row }]));

const isPreparedIdentity = (metadata: AgentRunMetadata): boolean =>
  Boolean(metadata.preparedAt) && !metadata.startedAt;

export interface CatalogMutationResultMessage {
  success: boolean;
  message: string;
}

export class AgentRunHistoryCatalogService {
  private readonly indexStore: AgentRunHistoryIndexStore;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly identityResolver: AgentRunHistoryIdentityResolver;
  private readonly agentDefinitionService: AgentDefinitionLookup;
  private readonly agentRunManager: AgentRunActivityLookup;
  private readonly state: CatalogState;
  private readonly definitionNameCache = new Map<string, string>();

  constructor(
    private readonly memoryDir: string,
    dependencies: {
      indexStore?: AgentRunHistoryIndexStore;
      metadataStore?: AgentRunMetadataStore;
      identityResolver?: AgentRunHistoryIdentityResolver;
      agentDefinitionService?: AgentDefinitionLookup;
      agentRunManager?: AgentRunActivityLookup;
    } = {},
  ) {
    this.indexStore =
      dependencies.indexStore ?? new AgentRunHistoryIndexStore(memoryDir);
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.identityResolver =
      dependencies.identityResolver ?? new AgentRunHistoryIdentityResolver(memoryDir);
    this.agentDefinitionService =
      dependencies.agentDefinitionService ?? {
        getAgentDefinitionById: async (agentDefinitionId: string) => {
          const { AgentDefinitionService } = await import(
            "../../agent-definition/services/agent-definition-service.js"
          );
          return AgentDefinitionService.getInstance().getAgentDefinitionById(agentDefinitionId);
        },
      };
    this.agentRunManager =
      dependencies.agentRunManager ?? {
        hasActiveRun: async (runId: string) => {
          const { AgentRunManager } = await import(
            "../../agent-execution/services/agent-run-manager.js"
          );
          return AgentRunManager.getInstance().hasActiveRun(runId);
        },
      };
    this.state = getState(memoryDir);
  }

  async listCatalogRows(): Promise<RunHistoryIndexRow[]> {
    await this.ensureInitialized();
    return this.getSortedRows();
  }

  async getCatalogRow(runId: string): Promise<RunHistoryIndexRow | null> {
    await this.ensureInitialized();
    return this.state.rows.get(runId.trim()) ?? null;
  }

  async recordPreparedRun(input: {
    runId: string;
    metadata: AgentRunMetadata;
    summary?: string | null;
    createdAt?: string;
  }): Promise<void> {
    const createdAt = input.createdAt ?? input.metadata.preparedAt ?? new Date().toISOString();
    await this.enqueue(async () => {
      const row = normalizeRow({
        runId: input.runId,
        agentDefinitionId: input.metadata.agentDefinitionId,
        agentName: await this.resolveAgentName(input.metadata.agentDefinitionId),
        workspaceRootPath: input.metadata.workspaceRootPath,
        summary: input.summary ?? "",
        createdAt,
        archivedAt: null,
        terminatedAt: null,
      });
      if (this.state.rows.has(row.runId) || await this.metadataStore.readMetadata(row.runId)) {
        throw new Error(`Run '${row.runId}' already exists in standalone history.`);
      }

      await this.metadataStore.writeMetadata(row.runId, {
        ...input.metadata,
        runId: row.runId,
      });
      const stagedRows = cloneRows(this.state.rows);
      stagedRows.set(row.runId, row);
      try {
        await this.flushRows(stagedRows);
        this.state.rows = stagedRows;
      } catch (error) {
        await fs.rm(path.dirname(this.metadataStore.getMetadataPath(row.runId)), {
          recursive: true,
          force: true,
        }).catch(() => undefined);
        throw error;
      }
    });
  }

  async recordRunStarted(input: {
    runId: string;
    platformAgentRunId?: string | null;
    runtimeKind?: RuntimeKind;
    startedAt?: string;
  }): Promise<AgentRunMetadata | null> {
    return this.mutate(async (rows) => {
      const metadata = await this.metadataStore.readMetadata(input.runId);
      if (!metadata) {
        return { value: null, shouldFlush: false };
      }
      const startedAt = input.startedAt ?? metadata.startedAt ?? new Date().toISOString();
      const nextMetadata: AgentRunMetadata = {
        ...metadata,
        runtimeKind: input.runtimeKind ?? metadata.runtimeKind,
        platformAgentRunId:
          input.platformAgentRunId === undefined
            ? metadata.platformAgentRunId
            : input.platformAgentRunId,
        startedAt,
      };
      await this.metadataStore.writeMetadata(input.runId, nextMetadata);

      const row = rows.get(input.runId);
      const shouldFlush = Boolean(row?.terminatedAt);
      if (row?.terminatedAt) {
        rows.set(input.runId, normalizeRow({ ...row, terminatedAt: null }));
      }
      return { value: nextMetadata, shouldFlush };
    });
  }

  async recordRunSummary(input: { runId: string; summary?: string | null }): Promise<void> {
    const summary = compactSummary(input.summary ?? null);
    if (!summary) {
      return;
    }
    await this.mutate(async (rows) => {
      const row = rows.get(input.runId);
      if (!row || row.summary === summary) {
        return { value: undefined, shouldFlush: false };
      }
      rows.set(input.runId, normalizeRow({ ...row, summary }));
      return { value: undefined, shouldFlush: true };
    });
  }

  async recordRunTerminated(input: { runId: string; terminatedAt?: string }): Promise<void> {
    const terminatedAt = input.terminatedAt ?? new Date().toISOString();
    await this.mutate(async (rows) => {
      const row = rows.get(input.runId);
      if (!row || row.terminatedAt === terminatedAt) {
        return { value: undefined, shouldFlush: false };
      }
      rows.set(input.runId, normalizeRow({ ...row, terminatedAt }));
      return { value: undefined, shouldFlush: true };
    });
  }

  async archiveRun(rawRunId: string): Promise<CatalogMutationResultMessage> {
    return this.setArchiveState(rawRunId, true);
  }

  async unarchiveRun(rawRunId: string): Promise<CatalogMutationResultMessage> {
    return this.setArchiveState(rawRunId, false);
  }

  async deleteRun(rawRunId: string): Promise<CatalogMutationResultMessage> {
    const identity = this.identityResolver.resolve(rawRunId, { rejectDraftIds: true });
    if (!identity) {
      return { success: false, message: "Invalid run ID path." };
    }
    if (await this.agentRunManager.hasActiveRun(identity.runId)) {
      return {
        success: false,
        message: "Run is active. Terminate it before deleting history.",
      };
    }

    return this.removeCatalogRowAndDirectory(identity.runId, identity.runDirPath, "deleted permanently");
  }

  async cancelPreparedRun(rawRunId: string): Promise<CatalogMutationResultMessage> {
    const identity = this.identityResolver.resolve(rawRunId);
    if (!identity) {
      return { success: false, message: "Invalid run ID path." };
    }
    if (await this.agentRunManager.hasActiveRun(identity.runId)) {
      return {
        success: false,
        message: "Prepared run already has an active runtime.",
      };
    }

    return this.enqueueValue<CatalogMutationResultMessage>(async () => {
      const metadata = await this.metadataStore.readMetadata(identity.runId);
      if (!metadata) {
        const stagedRows = cloneRows(this.state.rows);
        const existed = stagedRows.delete(identity.runId);
        if (existed) {
          await this.flushRows(stagedRows);
        }
        this.state.rows = stagedRows;
        return { success: true, message: "Prepared run already removed." };
      }
      if (!isPreparedIdentity(metadata)) {
        return {
          success: false,
          message: "Only unactivated prepared runs can be cancelled.",
        };
      }

      const stagedRows = cloneRows(this.state.rows);
      const result = this.removeCatalogRowAndDirectoryFromRows(
        stagedRows,
        identity.runId,
        "cancelled",
      );
      if (result.shouldFlush) {
        await this.flushRows(stagedRows);
      }
      this.state.rows = stagedRows;
      try {
        await fs.rm(identity.runDirPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Run '${identity.runId}' hidden from catalog but filesystem cleanup failed: ${String(error)}`);
        return {
          success: false,
          message: `Run '${identity.runId}' was removed from history, but filesystem cleanup failed. Run the history repair script if cleanup is needed.`,
        };
      }
      return result.value;
    });
  }

  private async setArchiveState(
    rawRunId: string,
    archived: boolean,
  ): Promise<CatalogMutationResultMessage> {
    const identity = this.identityResolver.resolve(rawRunId, { rejectDraftIds: true });
    if (!identity) {
      return { success: false, message: "Invalid run ID path." };
    }
    if (await this.agentRunManager.hasActiveRun(identity.runId)) {
      return {
        success: false,
        message: "Run is active. Terminate it before archiving history.",
      };
    }
    const verb = archived ? "archived" : "unarchived";
    return this.mutate<CatalogMutationResultMessage>(async (rows) => {
      const row = rows.get(identity.runId);
      if (!row) {
        return {
          value: { success: false, message: `Run history row not found for '${identity.runId}'.` },
          shouldFlush: false,
        };
      }
      const archivedAt = archived ? row.archivedAt ?? new Date().toISOString() : null;
      rows.set(identity.runId, normalizeRow({ ...row, archivedAt }));
      return {
        value: { success: true, message: `Run '${identity.runId}' ${verb}.` },
        shouldFlush: true,
      };
    });
  }

  private async removeCatalogRowAndDirectory(
    runId: string,
    runDirPath: string,
    resultVerb: string,
  ): Promise<CatalogMutationResultMessage> {
    return this.enqueueValue(async () => {
      const stagedRows = cloneRows(this.state.rows);
      const result = this.removeCatalogRowAndDirectoryFromRows(
        stagedRows,
        runId,
        resultVerb,
      );
      if (result.shouldFlush) {
        await this.flushRows(stagedRows);
      }
      this.state.rows = stagedRows;
      try {
        await fs.rm(runDirPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Run '${runId}' hidden from catalog but filesystem cleanup failed: ${String(error)}`);
        return {
          success: false,
          message: `Run '${runId}' was removed from history, but filesystem cleanup failed. Run the history repair script if cleanup is needed.`,
        };
      }
      return result.value;
    });
  }

  private removeCatalogRowAndDirectoryFromRows(
    rows: Map<string, AgentRunHistoryIndexRowRecord>,
    runId: string,
    resultVerb: string,
  ): CatalogMutationResult<CatalogMutationResultMessage> {
    const existed = rows.delete(runId);
    return {
      value: { success: true, message: `Run '${runId}' ${resultVerb}.` },
      shouldFlush: existed,
    };
  }

  private async mutate<T>(
    operation: (
      rows: Map<string, AgentRunHistoryIndexRowRecord>,
    ) => Promise<CatalogMutationResult<T>>,
  ): Promise<T> {
    return this.enqueueValue(async () => {
      const stagedRows = cloneRows(this.state.rows);
      const result = await operation(stagedRows);
      if (result.shouldFlush) {
        await this.flushRows(stagedRows);
      }
      this.state.rows = stagedRows;
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
            return [normalized.runId, normalized];
          }));
          this.state.initialized = true;
        })
        .catch((error) => {
          logger.warn(
            `Failed to initialize run history catalog from index. Run the migration/repair script if history is missing: ${String(error)}`,
          );
          this.state.rows = new Map();
          this.state.initialized = true;
        });
    }
    await this.state.initPromise;
  }

  private getSortedRows(
    rows: Map<string, AgentRunHistoryIndexRowRecord> = this.state.rows,
  ): RunHistoryIndexRow[] {
    return Array.from(rows.values())
      .map(normalizeRow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async flushRows(rows: Map<string, AgentRunHistoryIndexRowRecord>): Promise<void> {
    await this.indexStore.writeIndex(this.getSortedRows(rows));
  }

  private async resolveAgentName(agentDefinitionId: string): Promise<string> {
    const cached = this.definitionNameCache.get(agentDefinitionId);
    if (cached) {
      return cached;
    }
    const definition = await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    const resolvedName = definition?.name?.trim() || agentDefinitionId;
    this.definitionNameCache.set(agentDefinitionId, resolvedName);
    return resolvedName;
  }
}

const cachedCatalogServices = new Map<string, AgentRunHistoryCatalogService>();

export const getAgentRunHistoryCatalogService = (): AgentRunHistoryCatalogService => {
  const memoryDir = appConfigProvider.config.getMemoryDir();
  const key = path.resolve(memoryDir);
  const cached = cachedCatalogServices.get(key);
  if (cached) {
    return cached;
  }
  const created = new AgentRunHistoryCatalogService(memoryDir);
  cachedCatalogServices.set(key, created);
  return created;
};
