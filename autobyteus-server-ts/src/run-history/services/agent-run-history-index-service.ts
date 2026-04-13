import fs from "node:fs";
import path from "node:path";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type {
  RunHistoryIndexRow,
  RunKnownStatus,
} from "../domain/agent-run-history-index-types.js";
import { AgentRunHistoryIndexStore } from "../store/agent-run-history-index-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import {
  compactSummary,
  extractSummaryFromRawTraces,
} from "./run-history-service-helpers.js";

const nowIso = (): string => new Date().toISOString();

export class AgentRunHistoryIndexService {
  private readonly indexStore: AgentRunHistoryIndexStore;
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly memoryStore: MemoryFileStore;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly agentRunManager: AgentRunManager;
  private readonly definitionNameCache = new Map<string, string>();

  constructor(
    memoryDir: string,
    dependencies: {
      indexStore?: AgentRunHistoryIndexStore;
      metadataStore?: AgentRunMetadataStore;
      memoryStore?: MemoryFileStore;
      agentDefinitionService?: AgentDefinitionService;
      agentRunManager?: AgentRunManager;
    } = {},
  ) {
    this.indexStore =
      dependencies.indexStore ?? new AgentRunHistoryIndexStore(memoryDir);
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.memoryStore = dependencies.memoryStore ?? new MemoryFileStore(memoryDir);
    this.agentDefinitionService =
      dependencies.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.agentRunManager =
      dependencies.agentRunManager ?? AgentRunManager.getInstance();
  }

  async listRows(): Promise<RunHistoryIndexRow[]> {
    return this.indexStore.listRows();
  }

  async removeRow(runId: string): Promise<void> {
    await this.indexStore.removeRow(runId);
  }

  async recordRunCreated(input: {
    runId: string;
    metadata: AgentRunMetadata;
    summary: string;
    lastKnownStatus?: RunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    await this.upsertFromMetadata({
      runId: input.runId,
      metadata: input.metadata,
      summary: input.summary,
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? nowIso(),
    });
  }

  async recordRunRestored(input: {
    runId: string;
    metadata: AgentRunMetadata;
    lastKnownStatus?: RunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    const existing = await this.indexStore.getRow(input.runId);
    await this.upsertFromMetadata({
      runId: input.runId,
      metadata: input.metadata,
      summary: existing?.summary ?? "",
      lastKnownStatus: input.lastKnownStatus ?? "ACTIVE",
      lastActivityAt: input.lastActivityAt ?? nowIso(),
    });
  }

  async recordRunActivity(input: {
    runId: string;
    metadata?: AgentRunMetadata | null;
    summary?: string | null;
    lastKnownStatus?: RunKnownStatus;
  lastActivityAt?: string;
  }): Promise<void> {
    const lastActivityAt = input.lastActivityAt ?? nowIso();
    const lastKnownStatus = input.lastKnownStatus ?? "ACTIVE";
    const existing = await this.indexStore.getRow(input.runId);

    if (input.metadata) {
      await this.upsertFromMetadata({
        runId: input.runId,
        metadata: input.metadata,
        summary: this.resolveFirstSummary(existing?.summary, input.summary) ?? "",
        lastKnownStatus,
        lastActivityAt,
      });
      return;
    }

    const nextSummary = this.resolveFirstSummary(existing?.summary, input.summary);
    await this.indexStore.updateRow(input.runId, {
      ...(nextSummary !== undefined ? { summary: nextSummary } : {}),
      lastKnownStatus,
      lastActivityAt,
    });
  }

  async recordRunTerminated(runId: string): Promise<void> {
    await this.indexStore.updateRow(runId, {
      lastKnownStatus: "TERMINATED",
      lastActivityAt: nowIso(),
    });
  }

  async rebuildIndexFromDisk(): Promise<RunHistoryIndexRow[]> {
    const runIds = this.memoryStore.listRunDirs();
    const rows: RunHistoryIndexRow[] = [];
    for (const runId of runIds) {
      const metadata = await this.metadataStore.readMetadata(runId);
      if (!metadata) {
        continue;
      }
      const agentName = await this.resolveAgentName(metadata.agentDefinitionId);
      const summary = extractSummaryFromRawTraces(
        this.memoryStore.readRawTracesActive(runId, 300),
        this.memoryStore.readRawTracesArchive(runId, 300),
      );
      rows.push({
        runId,
        agentDefinitionId: metadata.agentDefinitionId,
        agentName,
        workspaceRootPath: canonicalizeWorkspaceRootPath(metadata.workspaceRootPath),
        summary,
        lastActivityAt: this.inferLastActivityAt(runId),
        lastKnownStatus: this.agentRunManager.hasActiveRun(runId)
          ? "ACTIVE"
          : metadata.lastKnownStatus,
      });
    }
    await this.indexStore.writeIndex({
      version: 1,
      rows,
    });
    return rows;
  }

  private async upsertFromMetadata(input: {
    runId: string;
    metadata: AgentRunMetadata;
    summary: string;
    lastKnownStatus: RunKnownStatus;
    lastActivityAt: string;
  }): Promise<void> {
    const agentName = await this.resolveAgentName(input.metadata.agentDefinitionId);
    const row: RunHistoryIndexRow = {
      runId: input.runId,
      agentDefinitionId: input.metadata.agentDefinitionId,
      agentName,
      workspaceRootPath: canonicalizeWorkspaceRootPath(input.metadata.workspaceRootPath),
      summary: compactSummary(input.summary),
      lastActivityAt: input.lastActivityAt,
      lastKnownStatus: input.lastKnownStatus,
    };
    await this.indexStore.upsertRow(row);
  }

  private resolveFirstSummary(
    existingSummary: string | null | undefined,
    nextSummary: string | null | undefined,
  ): string | undefined {
    const existing = compactSummary(existingSummary ?? null);
    if (existing) {
      return existing;
    }

    if (nextSummary === undefined || nextSummary === null) {
      return undefined;
    }

    return compactSummary(nextSummary);
  }

  private inferLastActivityAt(runId: string): string {
    const runDir = this.memoryStore.getRunDir(runId);
    const candidateFiles = [
      path.join(runDir, "raw_traces.jsonl"),
      path.join(runDir, "raw_traces_archive.jsonl"),
      path.join(runDir, "working_context_snapshot.json"),
      path.join(runDir, "run_metadata.json"),
    ];
    let latest = 0;
    for (const candidate of candidateFiles) {
      const info = this.memoryStore.getFileInfo(candidate);
      if (info) {
        latest = Math.max(latest, info.mtime);
      }
    }
    if (latest > 0) {
      return new Date(latest * 1000).toISOString();
    }
    try {
      const stat = fs.statSync(runDir);
      return stat.mtime.toISOString();
    } catch {
      return nowIso();
    }
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

let cachedAgentRunHistoryIndexService: AgentRunHistoryIndexService | null = null;

export const getAgentRunHistoryIndexService = (): AgentRunHistoryIndexService => {
  if (!cachedAgentRunHistoryIndexService) {
    cachedAgentRunHistoryIndexService = new AgentRunHistoryIndexService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunHistoryIndexService;
};
