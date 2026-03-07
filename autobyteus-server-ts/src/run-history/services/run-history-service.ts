import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { StreamEvent, StreamEventType } from "autobyteus-ts";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { MemoryFileStore } from "../../agent-memory-view/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import type { RuntimeReferenceHint } from "../../runtime-execution/runtime-adapter-port.js";
import { getRuntimeSessionStore, type RuntimeSessionStore } from "../../runtime-execution/runtime-session-store.js";
import {
  RunEditableFieldFlags,
  RunHistoryAgentGroup,
  RunHistoryIndexRow,
  RunHistoryWorkspaceGroup,
  RunKnownStatus,
  RunManifest,
  RunResumeConfig,
} from "../domain/models.js";
import { RunHistoryIndexStore } from "../store/run-history-index-store.js";
import { RunManifestStore } from "../store/run-manifest-store.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../utils/workspace-path-normalizer.js";
import {
  asObject,
  compactSummary,
  extractSummaryFromRawTraces,
  parseStatus,
} from "./run-history-service-helpers.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const nowIso = (): string => new Date().toISOString();

export interface DeleteRunHistoryResult {
  success: boolean;
  message: string;
}

export class RunHistoryService {
  private indexStore: RunHistoryIndexStore;
  private manifestStore: RunManifestStore;
  private memoryStore: MemoryFileStore;
  private agentRunManager: AgentRunManager;
  private definitionService: AgentDefinitionService;
  private definitionNameCache = new Map<string, string>();
  private runtimeSessionStore: RuntimeSessionStore;
  private runtimeAdapterRegistry: RuntimeAdapterRegistry;

  constructor(memoryDir: string) {
    this.indexStore = new RunHistoryIndexStore(memoryDir);
    this.manifestStore = new RunManifestStore(memoryDir);
    this.memoryStore = new MemoryFileStore(memoryDir);
    this.agentRunManager = AgentRunManager.getInstance();
    this.definitionService = AgentDefinitionService.getInstance();
    this.runtimeSessionStore = getRuntimeSessionStore();
    this.runtimeAdapterRegistry = getRuntimeAdapterRegistry();
  }

  async listRunHistory(limitPerAgent = 6): Promise<RunHistoryWorkspaceGroup[]> {
    let rows = await this.indexStore.listRows();
    if (rows.length === 0) {
      rows = await this.rebuildIndexFromDisk();
    }

    const activeRunIds = new Set(this.agentRunManager.listActiveRuns());
    const activeRuntimeIds = new Set(
      this.runtimeSessionStore
        .listSessions()
        .filter((session) => this.isRuntimeSessionRecordActive(session.runId, session.runtimeKind))
        .map((session) => session.runId),
    );
    const normalizedRows = rows.map((row) => ({
      ...row,
      workspaceRootPath: canonicalizeWorkspaceRootPath(row.workspaceRootPath),
    }));

    const workspaceMap = new Map<string, Map<string, RunHistoryAgentGroup>>();
    for (const row of normalizedRows) {
      const isActive = activeRunIds.has(row.runId) || activeRuntimeIds.has(row.runId);
      const runStatus: RunKnownStatus = isActive ? "ACTIVE" : row.lastKnownStatus;
      let agentMap = workspaceMap.get(row.workspaceRootPath);
      if (!agentMap) {
        agentMap = new Map<string, RunHistoryAgentGroup>();
        workspaceMap.set(row.workspaceRootPath, agentMap);
      }
      let agentGroup = agentMap.get(row.agentDefinitionId);
      if (!agentGroup) {
        agentGroup = {
          agentDefinitionId: row.agentDefinitionId,
          agentName: row.agentName,
          runs: [],
        };
        agentMap.set(row.agentDefinitionId, agentGroup);
      }
      agentGroup.runs.push({
        runId: row.runId,
        summary: row.summary,
        lastActivityAt: row.lastActivityAt,
        lastKnownStatus: runStatus,
        isActive,
      });
    }

    const workspaceGroups: RunHistoryWorkspaceGroup[] = [];
    for (const [workspaceRootPath, agentMap] of workspaceMap.entries()) {
      const agents = Array.from(agentMap.values())
        .map((group) => ({
          ...group,
          runs: group.runs
            .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
            .slice(0, Math.max(limitPerAgent, 1)),
        }))
        .sort((a, b) => a.agentName.localeCompare(b.agentName));
      workspaceGroups.push({
        workspaceRootPath,
        workspaceName: workspaceDisplayNameFromRootPath(workspaceRootPath),
        agents,
      });
    }

    workspaceGroups.sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
    return workspaceGroups;
  }

  async getRunResumeConfig(runId: string): Promise<RunResumeConfig> {
    const manifest = await this.manifestStore.readManifest(runId);
    if (!manifest) {
      throw new Error(`Run manifest not found for '${runId}'.`);
    }
    const isActive = this.agentRunManager.getAgentRun(runId) !== null || this.isRuntimeSessionActive(runId);
    const editableFields: RunEditableFieldFlags = {
      llmModelIdentifier: !isActive,
      llmConfig: !isActive,
      autoExecuteTools: !isActive,
      skillAccessMode: !isActive,
      workspaceRootPath: false,
      runtimeKind: false,
    };
    return {
      runId,
      isActive,
      manifestConfig: manifest,
      editableFields,
    };
  }

  async deleteRunHistory(runId: string): Promise<DeleteRunHistoryResult> {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      return {
        success: false,
        message: "Run ID is required.",
      };
    }

    const activeAgent = this.agentRunManager.getAgentRun(normalizedRunId);
    if (activeAgent) {
      return {
        success: false,
        message: "Run is active. Terminate it before deleting history.",
      };
    }

    const safeTarget = this.resolveSafeRunDirectory(normalizedRunId);
    if (!safeTarget) {
      return {
        success: false,
        message: "Invalid run ID path.",
      };
    }

    try {
      await fsPromises.rm(safeTarget, { recursive: true, force: true });
      await this.indexStore.removeRow(normalizedRunId);
      return {
        success: true,
        message: `Run '${normalizedRunId}' deleted permanently.`,
      };
    } catch (error) {
      logger.warn(
        `Failed to delete run history '${normalizedRunId}': ${String(error)}`,
      );
      return {
        success: false,
        message: `Failed to delete run history '${normalizedRunId}'.`,
      };
    }
  }

  async onRunTerminated(runId: string): Promise<void> {
    await this.indexStore.updateRow(runId, {
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso(),
    });
  }

  async onRuntimeEvent(runId: string, event: unknown): Promise<void> {
    const payload = asObject(event);
    if (!payload) {
      return;
    }

    const runtimeSession = this.runtimeSessionStore.getSession(runId);
    const manifest = await this.manifestStore.readManifest(runId);
    const runtimeKind = runtimeSession?.runtimeKind ?? manifest?.runtimeKind ?? null;
    if (!runtimeKind) {
      return;
    }

    let interpretation:
      | {
          normalizedMethod?: string | null;
          statusHint?: string | null;
          runtimeReferenceHint?: RuntimeReferenceHint | null;
        }
      | null = null;
    try {
      const adapter = this.runtimeAdapterRegistry.resolveAdapter(runtimeKind);
      interpretation = adapter.interpretRuntimeEvent?.(payload) ?? null;
    } catch {
      interpretation = null;
    }
    if (!interpretation) {
      return;
    }

    const method =
      typeof interpretation.normalizedMethod === "string" && interpretation.normalizedMethod.trim().length > 0
        ? interpretation.normalizedMethod
        : null;
    const statusHint =
      interpretation.statusHint === "ACTIVE" ||
      interpretation.statusHint === "IDLE" ||
      interpretation.statusHint === "ERROR"
        ? interpretation.statusHint
        : null;
    const runtimeReferenceHint = this.normalizeRuntimeReferenceHint(interpretation.runtimeReferenceHint);

    const existing = await this.indexStore.getRow(runId);
    if (!existing) {
      if (!manifest) {
        return;
      }
      await this.upsertRunHistoryRow({
        runId,
        manifest,
        summary: "",
        lastKnownStatus: "ACTIVE",
        lastActivityAt: nowIso(),
      });
      if (runtimeReferenceHint) {
        await this.updateManifestRuntimeReferenceHint(runId, runtimeReferenceHint);
      }
      return;
    }

    const status = statusHint ?? (method ? this.deriveStatusFromRuntimeMethod(method) : null);
    await this.indexStore.updateRow(runId, {
      lastActivityAt: nowIso(),
      lastKnownStatus: status ?? existing.lastKnownStatus,
    });
    if (runtimeReferenceHint) {
      await this.updateManifestRuntimeReferenceHint(runId, runtimeReferenceHint);
    }
  }

  async onAgentEvent(runId: string, event: StreamEvent): Promise<void> {
    const existing = await this.indexStore.getRow(runId);
    if (!existing) {
      const manifest = await this.manifestStore.readManifest(runId);
      if (!manifest) {
        return;
      }
      await this.upsertRunHistoryRow({
        runId,
        manifest,
        summary: "",
        lastKnownStatus: "ACTIVE",
        lastActivityAt: nowIso(),
      });
      return;
    }

    const eventStatus = this.deriveStatusFromEvent(event);
    await this.indexStore.updateRow(runId, {
      lastActivityAt: nowIso(),
      lastKnownStatus: eventStatus ?? existing.lastKnownStatus,
    });
  }

  async upsertRunHistoryRow(options: {
    runId: string;
    manifest: RunManifest;
    summary: string;
    lastKnownStatus?: RunKnownStatus;
    lastActivityAt?: string;
  }): Promise<void> {
    const agentName = await this.resolveAgentName(options.manifest.agentDefinitionId);
    const row: RunHistoryIndexRow = {
      runId: options.runId,
      agentDefinitionId: options.manifest.agentDefinitionId,
      agentName,
      workspaceRootPath: canonicalizeWorkspaceRootPath(options.manifest.workspaceRootPath),
      summary: compactSummary(options.summary),
      lastActivityAt: options.lastActivityAt ?? nowIso(),
      lastKnownStatus: options.lastKnownStatus ?? "ACTIVE",
    };
    await this.indexStore.upsertRow(row);
  }

  async rebuildIndexFromDisk(): Promise<RunHistoryIndexRow[]> {
    const runIds = this.memoryStore.listRunDirs();
    const rows: RunHistoryIndexRow[] = [];
    for (const runId of runIds) {
      const manifest = await this.manifestStore.readManifest(runId);
      if (!manifest) {
        continue;
      }
      const agentName = await this.resolveAgentName(manifest.agentDefinitionId);
      const summary = extractSummaryFromRawTraces(
        this.memoryStore.readRawTracesActive(runId, 300),
        this.memoryStore.readRawTracesArchive(runId, 300),
      );
      rows.push({
        runId,
        agentDefinitionId: manifest.agentDefinitionId,
        agentName,
        workspaceRootPath: canonicalizeWorkspaceRootPath(manifest.workspaceRootPath),
        summary,
        lastActivityAt: this.inferLastActivityAt(runId),
        lastKnownStatus:
          this.agentRunManager.getAgentRun(runId) || this.isRuntimeSessionActive(runId)
            ? "ACTIVE"
            : "IDLE",
      });
    }
    await this.indexStore.writeIndex({
      version: 1,
      rows,
    });
    return rows;
  }

  private inferLastActivityAt(runId: string): string {
    const runDir = this.memoryStore.getRunDir(runId);
    const candidateFiles = [
      path.join(runDir, "raw_traces.jsonl"),
      path.join(runDir, "raw_traces_archive.jsonl"),
      path.join(runDir, "working_context_snapshot.json"),
      path.join(runDir, "run_manifest.json"),
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

  private deriveStatusFromEvent(event: StreamEvent): RunKnownStatus | null {
    if (event.event_type === StreamEventType.ERROR_EVENT) {
      return "ERROR";
    }
    if (event.event_type === StreamEventType.AGENT_STATUS_UPDATED) {
      const data = event.data as Record<string, unknown> | undefined;
      const candidate =
        parseStatus(data?.new_status) ??
        parseStatus(data?.old_status) ??
        parseStatus(data?.status) ??
        parseStatus(data?.agent_status) ??
        parseStatus(data?.currentStatus);
      return candidate;
    }
    return "ACTIVE";
  }

  private deriveStatusFromRuntimeMethod(method: string): RunKnownStatus | null {
    if (method === "turn/started") {
      return "ACTIVE";
    }
    if (method === "turn/completed") {
      return "IDLE";
    }
    if (method === "error") {
      return "ERROR";
    }
    return null;
  }

  private normalizeRuntimeReferenceHint(
    hint: RuntimeReferenceHint | null | undefined,
  ): RuntimeReferenceHint | null {
    const sessionId =
      typeof hint?.sessionId === "string" && hint.sessionId.trim().length > 0
        ? hint.sessionId.trim()
        : null;
    const threadId =
      typeof hint?.threadId === "string" && hint.threadId.trim().length > 0
        ? hint.threadId.trim()
        : null;
    if (!sessionId && !threadId) {
      return null;
    }
    return {
      sessionId,
      threadId,
    };
  }

  private async updateManifestRuntimeReferenceHint(
    runId: string,
    hint: RuntimeReferenceHint,
  ): Promise<void> {
    const manifest = await this.manifestStore.readManifest(runId);
    if (!manifest) {
      return;
    }
    const nextSessionId = hint.sessionId ?? manifest.runtimeReference.sessionId ?? null;
    const nextThreadId = hint.threadId ?? manifest.runtimeReference.threadId ?? null;
    if (
      manifest.runtimeReference.sessionId === nextSessionId &&
      manifest.runtimeReference.threadId === nextThreadId
    ) {
      return;
    }
    await this.manifestStore.writeManifest(runId, {
      ...manifest,
      runtimeReference: {
        ...manifest.runtimeReference,
        sessionId: nextSessionId,
        threadId: nextThreadId,
      },
    });
  }

  private isRuntimeSessionActive(runId: string): boolean {
    const session = this.runtimeSessionStore.getSession(runId);
    if (!session) {
      return false;
    }
    return this.isRuntimeSessionRecordActive(runId, session.runtimeKind);
  }

  private isRuntimeSessionRecordActive(
    runId: string,
    runtimeKind: Parameters<RuntimeAdapterRegistry["resolveAdapter"]>[0],
  ): boolean {
    try {
      const adapter = this.runtimeAdapterRegistry.resolveAdapter(runtimeKind);
      if (!adapter.isRunActive) {
        return true;
      }
      return adapter.isRunActive(runId);
    } catch {
      return false;
    }
  }

  private resolveSafeRunDirectory(runId: string): string | null {
    const agentsRoot = path.resolve(this.memoryStore.getRunDir(""));
    const targetPath = path.resolve(this.memoryStore.getRunDir(runId));

    if (targetPath === agentsRoot) {
      return null;
    }

    const targetWithinAgentsRoot =
      targetPath === agentsRoot ||
      targetPath.startsWith(`${agentsRoot}${path.sep}`);
    if (!targetWithinAgentsRoot) {
      return null;
    }

    return targetPath;
  }

  private async resolveAgentName(agentDefinitionId: string): Promise<string> {
    const cached = this.definitionNameCache.get(agentDefinitionId);
    if (cached) {
      return cached;
    }
    const definition = await this.definitionService.getAgentDefinitionById(agentDefinitionId);
    const name = definition?.name?.trim() || "Agent";
    this.definitionNameCache.set(agentDefinitionId, name);
    return name;
  }
}

let cachedRunHistoryService: RunHistoryService | null = null;

export const getRunHistoryService = (): RunHistoryService => {
  if (!cachedRunHistoryService) {
    cachedRunHistoryService = new RunHistoryService(appConfigProvider.config.getMemoryDir());
  }
  return cachedRunHistoryService;
};
