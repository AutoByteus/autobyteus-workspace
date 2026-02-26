import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { StreamEvent, StreamEventType } from "autobyteus-ts";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { MemoryFileStore } from "../../agent-memory-view/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getCodexAppServerRuntimeService } from "../../runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import { normalizeCodexRuntimeMethod } from "../../runtime-execution/codex-app-server/codex-runtime-method-normalizer.js";
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

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const nowIso = (): string => new Date().toISOString();

const compactSummary = (value: string | null): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 100) {
    return normalized;
  }
  return `${normalized.slice(0, 97)}...`;
};

const parseStatus = (value: unknown): RunKnownStatus | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("IDLE") || normalized.includes("SHUTDOWN")) {
    return "IDLE";
  }
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) {
    return "ERROR";
  }
  if (normalized.includes("UNINITIALIZED")) {
    return "IDLE";
  }
  if (normalized.includes("RUN") || normalized.includes("ACTIVE") || normalized.includes("THINK")) {
    return "ACTIVE";
  }
  if (normalized.length > 0) {
    return "ACTIVE";
  }
  return null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const extractSummaryFromRawTraces = (
  active: Array<Record<string, unknown>>,
  archive: Array<Record<string, unknown>>,
): string => {
  const traces = [...archive, ...active].sort((a, b) => {
    const tsA = Number(a.ts ?? 0);
    const tsB = Number(b.ts ?? 0);
    return tsA - tsB;
  });
  for (const trace of traces) {
    if (trace.trace_type !== "user") {
      continue;
    }
    if (typeof trace.content === "string" && trace.content.trim()) {
      return compactSummary(trace.content);
    }
  }
  return "";
};

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
  private codexRuntimeService = getCodexAppServerRuntimeService();

  constructor(memoryDir: string) {
    this.indexStore = new RunHistoryIndexStore(memoryDir);
    this.manifestStore = new RunManifestStore(memoryDir);
    this.memoryStore = new MemoryFileStore(memoryDir);
    this.agentRunManager = AgentRunManager.getInstance();
    this.definitionService = AgentDefinitionService.getInstance();
    this.runtimeSessionStore = getRuntimeSessionStore();
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
        .filter((session) =>
          session.runtimeKind === "codex_app_server"
            ? this.codexRuntimeService.hasRunSession(session.runId)
            : true,
        )
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

    const method = typeof payload.method === "string"
      ? normalizeCodexRuntimeMethod(payload.method)
      : null;
    if (!method) {
      return;
    }

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

    const status = this.deriveStatusFromRuntimeMethod(method);
    const threadId = this.deriveThreadIdFromRuntimePayload(payload);
    await this.indexStore.updateRow(runId, {
      lastActivityAt: nowIso(),
      lastKnownStatus: status ?? existing.lastKnownStatus,
    });
    if (threadId) {
      await this.updateManifestThreadId(runId, threadId);
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

  private deriveThreadIdFromRuntimePayload(payload: Record<string, unknown>): string | null {
    const params = asObject(payload.params);
    const thread = asObject(params?.thread);
    return (
      asNonEmptyString(params?.threadId) ??
      asNonEmptyString(params?.thread_id) ??
      asNonEmptyString(thread?.id)
    );
  }

  private async updateManifestThreadId(runId: string, threadId: string): Promise<void> {
    const manifest = await this.manifestStore.readManifest(runId);
    if (!manifest || manifest.runtimeKind !== "codex_app_server") {
      return;
    }
    if (manifest.runtimeReference.threadId === threadId) {
      return;
    }
    await this.manifestStore.writeManifest(runId, {
      ...manifest,
      runtimeReference: {
        ...manifest.runtimeReference,
        threadId,
      },
    });
  }

  private isRuntimeSessionActive(runId: string): boolean {
    const session = this.runtimeSessionStore.getSession(runId);
    if (!session) {
      return false;
    }
    if (session.runtimeKind === "codex_app_server") {
      return this.codexRuntimeService.hasRunSession(runId);
    }
    return true;
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
