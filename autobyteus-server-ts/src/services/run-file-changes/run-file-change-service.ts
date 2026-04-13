import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { extractCandidateOutputPath, inferArtifactType } from "../../utils/artifact-utils.js";
import {
  EMPTY_RUN_FILE_CHANGE_PROJECTION,
  buildRunFileChangeId,
  invocationIdsMatch,
  type RunFileChangeArtifactType,
  type RunFileChangeEntry,
  type RunFileChangeProjection,
  type RunFileChangeSourceTool,
} from "./run-file-change-types.js";
import {
  RunFileChangeProjectionStore,
  getRunFileChangeProjectionStore,
} from "./run-file-change-projection-store.js";
import { canonicalizeRunFileChangePath } from "./run-file-change-path-identity.js";
import { RunFileChangeInvocationCache, type RunFileChangeInvocationContext } from "./run-file-change-invocation-cache.js";
import { normalizeRunFileChangeProjection } from "./run-file-change-projection-normalizer.js";
import {
  extractInvocationId,
  extractObservedPath,
  extractSegmentType,
  extractToolArguments,
  extractToolName,
  isFileChangeTool,
  nowIso,
} from "./run-file-change-event-payload.js";
import {
  cloneRunFileChangeProjection,
  resolveRunFileChangeWorkspaceRootPath,
} from "./run-file-change-runtime.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };
const asDeltaString = (value: unknown): string | null => (typeof value === "string" ? value : null);

export class RunFileChangeService {
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly workspaceManager: WorkspaceManager;
  private readonly invocationCache = new RunFileChangeInvocationCache();
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
      this.invocationCache.clearRun(run.runId);
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
        this.handleToolExecutionSucceeded(run, projection, event.payload);
        break;
      case AgentRunEventType.TOOL_EXECUTION_FAILED:
      case AgentRunEventType.TOOL_DENIED:
        this.handleToolExecutionFailure(run, projection, event.payload);
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
      return cloneRunFileChangeProjection(cached);
    }

    const loadedProjection =
      run.config.memoryDir
        ? await this.projectionStore.readProjection(run.config.memoryDir)
        : { ...EMPTY_RUN_FILE_CHANGE_PROJECTION, entries: [] };
    const normalizedProjection = normalizeRunFileChangeProjection(loadedProjection, {
      runId: run.runId,
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager),
      preferTransientContentOnTie: true,
    });

    this.projectionByRunId.set(run.runId, normalizedProjection);
    return cloneRunFileChangeProjection(normalizedProjection);
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

    const canonicalPath = this.canonicalizeObservedPath(run, extractObservedPath(payload));
    if (!canonicalPath) {
      return;
    }

    const invocationId = extractInvocationId(payload);
    const entry = this.upsertEntry(projection, {
      runId: run.runId,
      canonicalPath,
      sourceTool: segmentType,
      sourceInvocationId: invocationId,
      type: this.inferEntryType(canonicalPath),
    });
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
    const delta = asDeltaString(payload.delta);
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
    const invocationId = extractInvocationId(payload);
    const toolName = extractToolName(payload);
    const toolArguments = extractToolArguments(payload);
    if (invocationId) {
      this.invocationCache.record(run.runId, invocationId, {
        toolName,
        arguments: toolArguments,
        candidateOutputPath: extractCandidateOutputPath(toolArguments, null),
      });
    }

    if (!isFileChangeTool(toolName)) {
      return;
    }

    const canonicalPath = this.canonicalizeObservedPath(
      run,
      extractObservedPath(payload) ?? extractCandidateOutputPath(toolArguments, null),
    );
    if (!canonicalPath) {
      return;
    }

    const entry = this.upsertEntry(projection, {
      runId: run.runId,
      canonicalPath,
      sourceTool: toolName,
      sourceInvocationId: invocationId,
      type: this.inferEntryType(canonicalPath),
    });
    if (entry.status !== "streaming") {
      entry.status = "pending";
    }
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleToolExecutionSucceeded(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const invocationId = extractInvocationId(payload);
    const cachedInvocation = this.invocationCache.consume(run.runId, invocationId);
    const toolName = extractToolName(payload) ?? cachedInvocation?.toolName ?? null;

    if (isFileChangeTool(toolName)) {
      this.handleFileChangeToolSuccess(run, projection, payload, invocationId, toolName, cachedInvocation);
      return;
    }

    this.handleGeneratedOutputSuccess(run, projection, payload, invocationId, cachedInvocation);
  }

  private handleToolExecutionFailure(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
  ): void {
    const invocationId = extractInvocationId(payload);
    const cachedInvocation = this.invocationCache.consume(run.runId, invocationId);
    const toolName = extractToolName(payload) ?? cachedInvocation?.toolName ?? null;
    if (!isFileChangeTool(toolName)) {
      return;
    }

    const canonicalPath = this.resolveCanonicalFileChangePath(run, payload, cachedInvocation);
    const entry =
      (invocationId ? this.findEntryByInvocation(projection, invocationId) : null)
      ?? (canonicalPath ? this.findEntryByPath(projection, canonicalPath) : null);

    if (!entry) {
      return;
    }

    entry.status = "failed";
    entry.content = null;
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleFileChangeToolSuccess(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
    invocationId: string | null,
    toolName: Exclude<RunFileChangeSourceTool, "generated_output">,
    cachedInvocation: RunFileChangeInvocationContext | null,
  ): void {
    const canonicalPath = this.resolveCanonicalFileChangePath(run, payload, cachedInvocation);
    const entry =
      (invocationId ? this.findEntryByInvocation(projection, invocationId) : null)
      ?? (canonicalPath ? this.findEntryByPath(projection, canonicalPath) : null)
      ?? (canonicalPath
        ? this.upsertEntry(projection, {
          runId: run.runId,
          canonicalPath,
          sourceTool: toolName,
          sourceInvocationId: invocationId,
          type: this.inferEntryType(canonicalPath),
        })
        : null);

    if (!entry) {
      return;
    }

    entry.status = "available";
    entry.type = this.inferEntryType(entry.path);
    if (toolName !== "write_file") {
      entry.content = undefined;
    }
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private handleGeneratedOutputSuccess(
    run: AgentRun,
    projection: RunFileChangeProjection,
    payload: Record<string, unknown>,
    invocationId: string | null,
    cachedInvocation: RunFileChangeInvocationContext | null,
  ): void {
    const toolArguments = extractToolArguments(payload);
    const toolResult = payload.result;
    const candidateOutputPath =
      extractCandidateOutputPath(toolArguments, toolResult)
      ?? extractCandidateOutputPath(cachedInvocation?.arguments, toolResult)
      ?? cachedInvocation?.candidateOutputPath
      ?? extractCandidateOutputPath(null, toolResult);
    const canonicalPath = this.canonicalizeObservedPath(run, candidateOutputPath);
    if (!canonicalPath) {
      return;
    }

    const entry = this.upsertEntry(projection, {
      runId: run.runId,
      canonicalPath,
      sourceTool: "generated_output",
      sourceInvocationId: invocationId,
      type: this.inferEntryType(canonicalPath),
    });
    entry.status = "available";
    entry.content = undefined;
    entry.updatedAt = nowIso();
    this.publishEntry(run, entry);
  }

  private resolveCanonicalFileChangePath(
    run: AgentRun,
    payload: Record<string, unknown>,
    cachedInvocation: RunFileChangeInvocationContext | null,
  ): string | null {
    return this.canonicalizeObservedPath(
      run,
      extractObservedPath(payload)
        ?? extractCandidateOutputPath(extractToolArguments(payload), payload.result)
        ?? cachedInvocation?.candidateOutputPath
        ?? extractCandidateOutputPath(cachedInvocation?.arguments, payload.result),
    );
  }

  private canonicalizeObservedPath(run: AgentRun, observedPath: string | null): string | null {
    return canonicalizeRunFileChangePath(observedPath, resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager));
  }

  private inferEntryType(pathValue: string): RunFileChangeArtifactType {
    const inferred = inferArtifactType(pathValue);
    return inferred === "file"
      || inferred === "image"
      || inferred === "audio"
      || inferred === "video"
      || inferred === "pdf"
      || inferred === "csv"
      || inferred === "excel"
      ? inferred
      : "other";
  }

  private upsertEntry(
    projection: RunFileChangeProjection,
    input: {
      runId: string;
      canonicalPath: string;
      sourceTool: RunFileChangeSourceTool;
      sourceInvocationId: string | null;
      type: RunFileChangeArtifactType;
    },
  ): RunFileChangeEntry {
    const existing = this.findEntryByPath(projection, input.canonicalPath);
    if (existing) {
      existing.id = buildRunFileChangeId(input.runId, input.canonicalPath);
      existing.path = input.canonicalPath;
      existing.type = input.type;
      existing.sourceTool = input.sourceTool;
      existing.sourceInvocationId = input.sourceInvocationId ?? existing.sourceInvocationId;
      return existing;
    }

    const timestamp = nowIso();
    const entry: RunFileChangeEntry = {
      id: buildRunFileChangeId(input.runId, input.canonicalPath),
      runId: input.runId,
      path: input.canonicalPath,
      type: input.type,
      status: input.sourceTool === "write_file" ? "streaming" : "pending",
      sourceTool: input.sourceTool,
      sourceInvocationId: input.sourceInvocationId,
      content: input.sourceTool === "write_file" ? "" : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    projection.entries.push(entry);
    return entry;
  }

  private findEntryByPath(
    projection: RunFileChangeProjection,
    canonicalPath: string,
  ): RunFileChangeEntry | null {
    return projection.entries.find((entry) => entry.path === canonicalPath) ?? null;
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
