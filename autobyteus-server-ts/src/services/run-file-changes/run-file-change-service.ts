import fs from "node:fs/promises";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  EMPTY_RUN_FILE_CHANGE_PROJECTION,
  buildRunFileChangeId,
  invocationIdsMatch,
  normalizeRunFileChangePath,
  type RunFileChangeEntry,
  type RunFileChangeProjection,
  type RunFileChangeSourceTool,
} from "./run-file-change-types.js";
import {
  RunFileChangeProjectionStore,
  getRunFileChangeProjectionStore,
} from "./run-file-change-projection-store.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const nowIso = (): string => new Date().toISOString();

const isWindowsAbsolutePath = (value: string): boolean => /^[A-Za-z]:[\\/]/.test(value);
const isAbsoluteFilePath = (value: string): boolean => path.isAbsolute(value) || isWindowsAbsolutePath(value);
const isUnsupportedBinaryPreviewPath = (filePath: string): boolean => {
  const mimeType = lookupMime(filePath)?.toString();
  if (!mimeType) {
    return false;
  }

  return (
    mimeType.startsWith("image/")
    || mimeType.startsWith("audio/")
    || mimeType.startsWith("video/")
    || mimeType === "application/pdf"
    || mimeType === "application/zip"
    || mimeType === "application/octet-stream"
    || mimeType === "application/vnd.ms-excel"
    || mimeType.includes("spreadsheetml")
  );
};

const pathWithinRoot = (rootPath: string, candidatePath: string): boolean => {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return (
    normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  );
};

const extractSegmentMetadata = (payload: Record<string, unknown>): Record<string, unknown> =>
  asObject(payload.metadata);

const extractToolArguments = (payload: Record<string, unknown>): Record<string, unknown> =>
  asObject(payload.arguments);

const extractPayloadPath = (payload: Record<string, unknown>): string | null => {
  const metadata = extractSegmentMetadata(payload);
  const argumentsPayload = extractToolArguments(payload);
  const candidates = [payload.path, metadata.path, argumentsPayload.path];
  for (const candidate of candidates) {
    const resolved = asString(candidate);
    if (resolved) {
      return normalizeRunFileChangePath(resolved);
    }
  }
  return null;
};

const extractInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.invocation_id, payload.id];
  for (const candidate of candidates) {
    const resolved = asString(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return null;
};

const extractSegmentType = (payload: Record<string, unknown>): string | null => {
  const segmentType = asString(payload.segment_type);
  if (!segmentType) {
    return null;
  }
  return segmentType;
};

const extractToolName = (payload: Record<string, unknown>): string | null => {
  return asString(payload.tool_name);
};

const isFileChangeTool = (toolName: string | null): toolName is RunFileChangeSourceTool =>
  toolName === "write_file" || toolName === "edit_file";

const cloneProjection = (projection: RunFileChangeProjection): RunFileChangeProjection => ({
  version: 1,
  entries: projection.entries.map((entry) => ({ ...entry })),
});

export class RunFileChangeService {
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly workspaceManager: WorkspaceManager;
  private readonly projectionByRunId = new Map<string, RunFileChangeProjection>();
  private readonly operationQueueByRunId = new Map<string, Promise<void>>();

  constructor(options: {
    projectionStore?: RunFileChangeProjectionStore;
    workspaceManager?: WorkspaceManager;
  } = {}) {
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
  }

  attachToRun(run: AgentRun): () => void {
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || event.eventType === AgentRunEventType.FILE_CHANGE_UPDATED) {
        return;
      }
      void this.enqueueRunEvent(run, event);
    });

    return () => {
      unsubscribe();
      this.projectionByRunId.delete(run.runId);
      this.operationQueueByRunId.delete(run.runId);
    };
  }

  async getProjectionForRun(run: AgentRun): Promise<RunFileChangeProjection> {
    return this.loadProjection(run);
  }

  private enqueueRunEvent(run: AgentRun, event: AgentRunEvent): Promise<void> {
    const previous = this.operationQueueByRunId.get(run.runId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.handleRunEvent(run, event);
        } catch (error) {
          logger.warn(
            `RunFileChangeService: failed processing '${event.eventType}' for run '${run.runId}': ${String(error)}`,
          );
        }
      });

    this.operationQueueByRunId.set(run.runId, next);
    void next.finally(() => {
      if (this.operationQueueByRunId.get(run.runId) === next) {
        this.operationQueueByRunId.delete(run.runId);
      }
    });
    return next;
  }

  private async handleRunEvent(run: AgentRun, event: AgentRunEvent): Promise<void> {
    const projection = await this.loadProjection(run);
    const before = JSON.stringify(projection);

    switch (event.eventType) {
      case AgentRunEventType.SEGMENT_START:
        this.handleSegmentStart(run, projection, event.payload);
        break;
      case AgentRunEventType.SEGMENT_CONTENT:
        this.handleSegmentContent(run, projection, event.payload);
        break;
      case AgentRunEventType.SEGMENT_END:
        this.handleSegmentEnd(run, projection, event.payload);
        break;
      case AgentRunEventType.TOOL_EXECUTION_STARTED:
        this.handleToolExecutionStarted(run, projection, event.payload);
        break;
      case AgentRunEventType.TOOL_EXECUTION_SUCCEEDED:
        await this.handleToolExecutionSucceeded(run, projection, event.payload);
        break;
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
      case AgentRunEventType.TOOL_DENIED:
        this.handleToolExecutionFailure(run, projection, event.payload);
        break;
      case AgentRunEventType.ARTIFACT_UPDATED:
      case AgentRunEventType.ARTIFACT_PERSISTED:
        await this.handleArtifactSignal(run, projection, event);
        break;
      default:
        return;
    }

    const after = JSON.stringify(projection);
    if (before === after) {
      return;
    }

    this.projectionByRunId.set(run.runId, projection);
    if (run.config.memoryDir) {
      await this.projectionStore.writeProjection(run.config.memoryDir, projection);
    }
  }

  private async loadProjection(run: AgentRun): Promise<RunFileChangeProjection> {
    const cached = this.projectionByRunId.get(run.runId);
    if (cached) {
      return cloneProjection(cached);
    }

    const loaded =
      run.config.memoryDir
        ? await this.projectionStore.readProjection(run.config.memoryDir)
        : { ...EMPTY_RUN_FILE_CHANGE_PROJECTION, entries: [] };
    this.projectionByRunId.set(run.runId, loaded);
    return cloneProjection(loaded);
  }

  private handleSegmentStart(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const segmentType = extractSegmentType(payload);
    if (!isFileChangeTool(segmentType)) {
      return;
    }

    const normalizedPath = extractPayloadPath(payload);
    if (!normalizedPath) {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const entry = this.upsertEntry(projection, run.runId, normalizedPath, segmentType, invocationId);
    entry.status = segmentType === "write_file" ? "streaming" : "pending";
    if (segmentType === "write_file") {
      entry.content = "";
    }
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleSegmentContent(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const segmentType = extractSegmentType(payload);
    if (segmentType !== "write_file") {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const delta = asString(payload.delta);
    if (!invocationId || !delta) {
      return;
    }

    const entry = this.findEntryByInvocation(projection, invocationId);
    if (!entry) {
      return;
    }

    entry.status = "streaming";
    entry.content = `${entry.content ?? ""}${delta}`;
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleSegmentEnd(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const segmentType = extractSegmentType(payload);
    if (segmentType !== "write_file") {
      return;
    }

    const invocationId = extractInvocationId(payload);
    if (!invocationId) {
      return;
    }

    const entry = this.findEntryByInvocation(projection, invocationId);
    if (!entry || entry.status !== "streaming") {
      return;
    }

    entry.status = "pending";
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleToolExecutionStarted(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const toolName = extractToolName(payload);
    if (!isFileChangeTool(toolName)) {
      return;
    }

    const normalizedPath = extractPayloadPath(payload);
    if (!normalizedPath) {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const entry = this.upsertEntry(projection, run.runId, normalizedPath, toolName, invocationId);
    if (entry.status !== "streaming") {
      entry.status = "pending";
    }
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private async handleToolExecutionSucceeded(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const toolName = extractToolName(payload);
    if (!isFileChangeTool(toolName)) {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const normalizedPath = extractPayloadPath(payload);
    const entry =
      (invocationId ? this.findEntryByInvocation(projection, invocationId) : null)
      ?? (normalizedPath ? this.findEntryByPath(projection, normalizedPath) : null)
      ?? (normalizedPath
        ? this.upsertEntry(projection, run.runId, normalizedPath, toolName, invocationId)
        : null);

    if (!entry) {
      return;
    }

    try {
      entry.content = isUnsupportedBinaryPreviewPath(entry.path)
        ? null
        : await this.captureCommittedContent(run, entry.path);
      entry.status = "available";
    } catch (error) {
      logger.warn(
        `RunFileChangeService: failed capturing committed content for run '${run.runId}' at '${entry.path}': ${String(error)}`,
      );
      entry.status = "failed";
    }
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleToolExecutionFailure(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const toolName = extractToolName(payload);
    if (!isFileChangeTool(toolName)) {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const normalizedPath = extractPayloadPath(payload);
    const entry =
      (invocationId ? this.findEntryByInvocation(projection, invocationId) : null)
      ?? (normalizedPath ? this.findEntryByPath(projection, normalizedPath) : null);

    if (!entry) {
      return;
    }

    entry.status = "failed";
    entry.content = null;
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private async handleArtifactSignal(
    run: AgentRun,
    projection: RunFileChangeProjection,
    event: AgentRunEvent,
  ): Promise<void> {
    const artifactType = asString(event.payload.type);
    if (artifactType && artifactType !== "file") {
      return;
    }

    const normalizedPath = extractPayloadPath(event.payload);
    if (!normalizedPath) {
      return;
    }

    const sourceTool: RunFileChangeSourceTool =
      event.eventType === AgentRunEventType.ARTIFACT_UPDATED ? "edit_file" : "write_file";
    const entry =
      this.findEntryByPath(projection, normalizedPath)
      ?? this.upsertEntry(projection, run.runId, normalizedPath, sourceTool, null);

    const artifactId = asString(event.payload.artifact_id);
    if (artifactId) {
      entry.backendArtifactId = artifactId;
    }
    entry.updatedAt = nowIso();

    if (event.eventType === AgentRunEventType.ARTIFACT_PERSISTED && entry.status !== "available") {
      try {
        entry.content = isUnsupportedBinaryPreviewPath(entry.path)
          ? null
          : await this.captureCommittedContent(run, entry.path);
        entry.status = "available";
      } catch (error) {
        logger.warn(
          `RunFileChangeService: failed capturing artifact-persisted content for run '${run.runId}' at '${entry.path}': ${String(error)}`,
        );
        entry.status = "failed";
      }
    }

    this.publishEntry(run, entry);
  }

  private upsertEntry(
    projection: RunFileChangeProjection,
    runId: string,
    normalizedPath: string,
    sourceTool: RunFileChangeSourceTool,
    invocationId: string | null,
  ): RunFileChangeEntry {
    const existing = this.findEntryByPath(projection, normalizedPath);
    if (existing) {
      existing.path = normalizedPath;
      existing.sourceTool = sourceTool;
      existing.sourceInvocationId = invocationId ?? existing.sourceInvocationId;
      return existing;
    }

    const timestamp = nowIso();
    const entry: RunFileChangeEntry = {
      id: buildRunFileChangeId(runId, normalizedPath),
      runId,
      path: normalizedPath,
      type: "file",
      status: sourceTool === "write_file" ? "streaming" : "pending",
      sourceTool,
      sourceInvocationId: invocationId,
      backendArtifactId: null,
      content: sourceTool === "write_file" ? "" : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    projection.entries.push(entry);
    return entry;
  }

  private findEntryByPath(
    projection: RunFileChangeProjection,
    normalizedPath: string,
  ): RunFileChangeEntry | null {
    return projection.entries.find((entry) => entry.path === normalizedPath) ?? null;
  }

  private findEntryByInvocation(
    projection: RunFileChangeProjection,
    invocationId: string,
  ): RunFileChangeEntry | null {
    return (
      projection.entries.find((entry) =>
        invocationIdsMatch(entry.sourceInvocationId, invocationId),
      ) ?? null
    );
  }

  private async captureCommittedContent(run: AgentRun, filePath: string): Promise<string> {
    const absolutePath = this.resolveAbsolutePath(run, filePath);
    if (!absolutePath) {
      throw new Error("Unable to resolve file path for committed content capture.");
    }

    return fs.readFile(absolutePath, "utf-8");
  }

  private resolveAbsolutePath(run: AgentRun, filePath: string): string | null {
    if (isAbsoluteFilePath(filePath)) {
      return path.resolve(filePath);
    }

    const workspaceId = run.config.workspaceId;
    if (!workspaceId) {
      return null;
    }

    let workspaceRoot: string | null = null;
    try {
      workspaceRoot = this.workspaceManager.getWorkspaceById(workspaceId)?.getBasePath() ?? null;
    } catch (error) {
      logger.warn(
        `RunFileChangeService: failed resolving workspace '${workspaceId}' for run '${run.runId}': ${String(error)}`,
      );
      return null;
    }
    if (!workspaceRoot) {
      return null;
    }

    const absolutePath = path.resolve(workspaceRoot, filePath);
    if (!pathWithinRoot(workspaceRoot, absolutePath)) {
      return null;
    }
    return absolutePath;
  }

  private publishEntry(run: AgentRun, entry: RunFileChangeEntry): void {
    run.emitLocalEvent({
      eventType: AgentRunEventType.FILE_CHANGE_UPDATED,
      runId: run.runId,
      statusHint: null,
      payload: { ...entry },
    });
  }
}

let cachedRunFileChangeService: RunFileChangeService | null = null;

export const getRunFileChangeService = (): RunFileChangeService => {
  if (!cachedRunFileChangeService) {
    cachedRunFileChangeService = new RunFileChangeService();
  }
  return cachedRunFileChangeService;
};
