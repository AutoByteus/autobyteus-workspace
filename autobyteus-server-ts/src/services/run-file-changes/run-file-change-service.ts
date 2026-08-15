import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamMemberExecutionIdentity } from "../../agent-team-execution/domain/team-member-execution-identity.js";
import { TeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { canonicalizeRunFileChangePath } from "./run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "./run-file-change-projection-normalizer.js";
import { RunFileChangeProjectionStore, getRunFileChangeProjectionStore } from "./run-file-change-projection-store.js";
import { cloneRunFileChangeProjection, resolveRunFileChangeWorkspaceRootPath } from "./run-file-change-runtime.js";
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

const STATUS: RunFileChangeStatus[] = ["streaming", "pending", "available", "failed"];
const TOOLS: RunFileChangeSourceTool[] = ["write_file", "edit_file", "generated_output"];
const TYPES: RunFileChangeArtifactType[] = ["file", "image", "audio", "video", "pdf", "csv", "excel", "other"];
const optional = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const timestamp = (value: unknown, fallback: string): string => optional(value) ?? fallback;

type ProjectionContext = { runId: string; memoryDir: string | null; workspaceRootPath: string | null };

export class RunFileChangeService {
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly workspaceManager: WorkspaceManager;
  private readonly teamLocations: TeamRunExecutionTreeLocationService;
  private readonly projections = new Map<string, RunFileChangeProjection>();
  private readonly queues = new Map<string, Promise<void>>();

  constructor(options: {
    projectionStore?: RunFileChangeProjectionStore;
    workspaceManager?: WorkspaceManager;
    teamLocations?: TeamRunExecutionTreeLocationService;
    memoryDir?: string;
  } = {}) {
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.teamLocations = options.teamLocations ?? new TeamRunExecutionTreeLocationService({ memoryDir: options.memoryDir });
  }

  attachToRun(run: AgentRun): () => void {
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (isAgentRunEvent(event) && event.eventType === AgentRunEventType.FILE_CHANGE) {
        void this.enqueue(this.fromRun(run), event);
      }
    });
    return () => { unsubscribe(); this.clear(run.runId); };
  }

  attachToTeamRun(root: RootTeamRun): () => void {
    const runIds = new Set<string>();
    const unsubscribe = root.subscribeToEvents(({ event }) => {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT || event.payload.eventType !== "FILE_CHANGE") return;
      const context = this.fromTeamEvent(root, event.execution);
      if (!context) return;
      runIds.add(context.runId);
      void this.enqueue(context, {
        eventType: AgentRunEventType.FILE_CHANGE,
        runId: context.runId,
        statusHint: event.payload.statusHint,
        payload: {
          path: event.payload.details.path, type: event.payload.details.fileType,
          status: event.payload.details.status, sourceTool: event.payload.details.sourceTool,
          sourceInvocationId: event.payload.details.sourceInvocationId,
          content: event.payload.details.content, createdAt: event.payload.details.createdAt,
          updatedAt: event.payload.details.updatedAt,
        },
      });
    });
    return () => { unsubscribe(); runIds.forEach((runId) => this.clear(runId)); };
  }

  getProjectionForRun(run: AgentRun): Promise<RunFileChangeProjection> { return this.load(this.fromRun(run)); }

  async getProjectionForTeamMemberRun(root: RootTeamRun, agentRunId: string): Promise<RunFileChangeProjection> {
    const context = this.fromTeamEvent(root, root.getAgentExecution(agentRunId)?.identity ?? null);
    return this.load(context ?? { runId: agentRunId, memoryDir: null, workspaceRootPath: null });
  }

  private enqueue(context: ProjectionContext, event: AgentRunEvent): Promise<void> {
    const previous = this.queues.get(context.runId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      try { await this.handle(context, event); }
      catch (error) { console.warn(`RunFileChangeService failed for '${context.runId}': ${String(error)}`); }
    });
    this.queues.set(context.runId, next);
    void next.finally(() => { if (this.queues.get(context.runId) === next) this.queues.delete(context.runId); });
    return next;
  }

  private async handle(context: ProjectionContext, event: AgentRunEvent): Promise<void> {
    const projection = await this.load(context);
    const entry = this.normalizeEntry(context, event.payload);
    if (!entry) return;
    const before = JSON.stringify(projection);
    this.upsert(projection, entry);
    if (before === JSON.stringify(projection)) return;
    this.projections.set(context.runId, projection);
    if (context.memoryDir) await this.projectionStore.writeProjection(context.memoryDir, projection);
  }

  private async load(context: ProjectionContext): Promise<RunFileChangeProjection> {
    const cached = this.projections.get(context.runId);
    if (cached) return cloneRunFileChangeProjection(cached);
    const stored = context.memoryDir
      ? await this.projectionStore.readProjection(context.memoryDir)
      : { ...EMPTY_RUN_FILE_CHANGE_PROJECTION, entries: [] };
    const projection = normalizeRunFileChangeProjection(stored, {
      runId: context.runId, workspaceRootPath: context.workspaceRootPath,
      preferTransientContentOnTie: true,
    });
    this.projections.set(context.runId, projection);
    return cloneRunFileChangeProjection(projection);
  }

  private normalizeEntry(context: ProjectionContext, raw: Record<string, unknown>): RunFileChangeEntry | null {
    const canonicalPath = canonicalizeRunFileChangePath(optional(raw.path), context.workspaceRootPath);
    if (!canonicalPath) return null;
    const updatedAt = timestamp(raw.updatedAt, new Date().toISOString());
    const entry: RunFileChangeEntry = {
      id: buildRunFileChangeId(context.runId, canonicalPath), runId: context.runId,
      path: normalizeRunFileChangePath(canonicalPath),
      type: TYPES.includes(raw.type as RunFileChangeArtifactType) ? raw.type as RunFileChangeArtifactType : "file",
      status: STATUS.includes(raw.status as RunFileChangeStatus) ? raw.status as RunFileChangeStatus : "available",
      sourceTool: TOOLS.includes(raw.sourceTool as RunFileChangeSourceTool) ? raw.sourceTool as RunFileChangeSourceTool : "generated_output",
      sourceInvocationId: optional(raw.sourceInvocationId), createdAt: timestamp(raw.createdAt, updatedAt), updatedAt,
    };
    if (typeof raw.content === "string" || raw.content === null) entry.content = raw.content;
    return entry;
  }

  private fromRun(run: AgentRun): ProjectionContext {
    return { runId: run.runId, memoryDir: run.config.memoryDir, workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager) };
  }

  private fromTeamEvent(root: RootTeamRun, identity: TeamMemberExecutionIdentity | null): ProjectionContext | null {
    if (!identity) return null;
    const execution = root.getAgentExecution(identity.agentRunId);
    if (!execution || execution.identity.memberAddress !== identity.memberAddress) return null;
    const memoryDir = this.teamLocations.findAgentSync({ agentRunId: identity.agentRunId })?.memoryDir ?? null;
    return {
      runId: identity.agentRunId,
      memoryDir,
      workspaceRootPath: execution.launchConfiguration?.workspaceRootPath ?? null,
    };
  }

  private upsert(projection: RunFileChangeProjection, incoming: RunFileChangeEntry): void {
    const existing = projection.entries.find((entry) => entry.path === incoming.path);
    if (!existing) { projection.entries.push(incoming); return; }
    const content = Object.hasOwn(incoming, "content") ? { content: incoming.content ?? null } : {};
    Object.assign(existing, incoming, content, { createdAt: existing.createdAt || incoming.createdAt });
  }

  private clear(runId: string): void { this.projections.delete(runId); this.queues.delete(runId); }
}

let cachedRunFileChangeService: RunFileChangeService | null = null;
export const getRunFileChangeService = (): RunFileChangeService => cachedRunFileChangeService ??= new RunFileChangeService();
