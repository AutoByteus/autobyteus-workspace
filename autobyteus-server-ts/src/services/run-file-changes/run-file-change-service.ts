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
  normalizeRunFileChangePath,
  type RunFileChangeArtifactType,
  type RunFileChangeEntry,
  type RunFileChangeProjection,
  type RunFileChangeSourceTool,
  type RunFileChangeStatus,
} from "./run-file-change-types.js";
import {
  RunFileChangeProjectionStore,
  getRunFileChangeProjectionStore,
} from "./run-file-change-projection-store.js";
import { canonicalizeRunFileChangePath } from "./run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "./run-file-change-projection-normalizer.js";
import {
  cloneRunFileChangeProjection,
  resolveRunFileChangeWorkspaceRootPath,
} from "./run-file-change-runtime.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

const STATUS_VALUES: RunFileChangeStatus[] = ["streaming", "pending", "available", "failed"];
const SOURCE_TOOL_VALUES: RunFileChangeSourceTool[] = ["write_file", "edit_file", "generated_output"];
const ARTIFACT_TYPE_VALUES: RunFileChangeArtifactType[] = [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
];

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const normalizeStatus = (value: unknown): RunFileChangeStatus =>
  STATUS_VALUES.includes(value as RunFileChangeStatus)
    ? (value as RunFileChangeStatus)
    : "available";

const normalizeSourceTool = (value: unknown): RunFileChangeSourceTool =>
  SOURCE_TOOL_VALUES.includes(value as RunFileChangeSourceTool)
    ? (value as RunFileChangeSourceTool)
    : "generated_output";

const normalizeArtifactType = (value: unknown): RunFileChangeArtifactType =>
  ARTIFACT_TYPE_VALUES.includes(value as RunFileChangeArtifactType)
    ? (value as RunFileChangeArtifactType)
    : "file";

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalContent = (value: unknown): string | null | undefined => {
  if (typeof value === "string") {
    return value;
  }

  return value === null ? null : undefined;
};

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
      if (!isAgentRunEvent(event) || event.eventType !== AgentRunEventType.FILE_CHANGE) {
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
          await this.handleFileChangeEvent(run, event);
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

  private async handleFileChangeEvent(run: AgentRun, event: AgentRunEvent): Promise<void> {
    const projection = await this.loadProjection(run);
    const before = JSON.stringify(projection);
    const entry = this.normalizeLiveEntry(run, event.payload);
    if (!entry) {
      return;
    }

    this.upsertEntry(projection, entry);

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

  private normalizeLiveEntry(
    run: AgentRun,
    rawEntry: Record<string, unknown>,
  ): RunFileChangeEntry | null {
    const canonicalPath = canonicalizeRunFileChangePath(
      normalizeOptionalString(rawEntry.path),
      resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager),
    );
    if (!canonicalPath) {
      return null;
    }

    const createdAtFallback = new Date().toISOString();
    const updatedAt = normalizeTimestamp(rawEntry.updatedAt, createdAtFallback);
    const createdAt = normalizeTimestamp(rawEntry.createdAt, updatedAt);
    const entry: RunFileChangeEntry = {
      id: buildRunFileChangeId(run.runId, canonicalPath),
      runId: run.runId,
      path: normalizeRunFileChangePath(canonicalPath),
      type: normalizeArtifactType(rawEntry.type),
      status: normalizeStatus(rawEntry.status),
      sourceTool: normalizeSourceTool(rawEntry.sourceTool),
      sourceInvocationId: normalizeOptionalString(rawEntry.sourceInvocationId),
      createdAt,
      updatedAt,
    };

    const content = normalizeOptionalContent(rawEntry.content);
    if (content !== undefined) {
      entry.content = content;
    }

    return entry;
  }

  private upsertEntry(
    projection: RunFileChangeProjection,
    incoming: RunFileChangeEntry,
  ): void {
    const existing = projection.entries.find((entry) => entry.path === incoming.path) ?? null;
    if (!existing) {
      projection.entries.push(incoming);
      return;
    }

    existing.id = incoming.id;
    existing.runId = incoming.runId;
    existing.path = incoming.path;
    existing.type = incoming.type;
    existing.status = incoming.status;
    existing.sourceTool = incoming.sourceTool;
    existing.sourceInvocationId = incoming.sourceInvocationId ?? existing.sourceInvocationId;
    if (Object.prototype.hasOwnProperty.call(incoming, "content")) {
      existing.content = incoming.content ?? null;
    }
    existing.createdAt = existing.createdAt || incoming.createdAt;
    existing.updatedAt = incoming.updatedAt;
  }
}

let cachedRunFileChangeService: RunFileChangeService | null = null;

export const getRunFileChangeService = (): RunFileChangeService => {
  if (!cachedRunFileChangeService) {
    cachedRunFileChangeService = new RunFileChangeService();
  }
  return cachedRunFileChangeService;
};
