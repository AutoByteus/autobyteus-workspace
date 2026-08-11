import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamAgentExecutionBinding } from "../../agent-team-execution/domain/team-agent-execution-binding.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { AgentMemoryScope } from "../../agent-memory/domain/agent-memory-location.js";
import { AgentMemoryLocationService, getAgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  EMPTY_RUN_FILE_CHANGE_PROJECTION, buildRunFileChangeId, normalizeRunFileChangePath,
  type RunFileChangeArtifactType, type RunFileChangeEntry, type RunFileChangeProjection,
  type RunFileChangeSourceTool, type RunFileChangeStatus,
} from "./run-file-change-types.js";
import { RunFileChangeProjectionStore, getRunFileChangeProjectionStore } from "./run-file-change-projection-store.js";
import { canonicalizeRunFileChangePath } from "./run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "./run-file-change-projection-normalizer.js";
import { cloneRunFileChangeProjection, resolveRunFileChangeWorkspaceRootPath } from "./run-file-change-runtime.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };
const STATUS_VALUES: RunFileChangeStatus[] = ["streaming", "pending", "available", "failed"];
const SOURCE_TOOL_VALUES: RunFileChangeSourceTool[] = ["write_file", "edit_file", "generated_output"];
const ARTIFACT_TYPE_VALUES: RunFileChangeArtifactType[] = ["file", "image", "audio", "video", "pdf", "csv", "excel", "other"];
const optional = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const timestamp = (value: unknown, fallback: string): string => optional(value) ?? fallback;
const status = (value: unknown): RunFileChangeStatus => STATUS_VALUES.includes(value as RunFileChangeStatus) ? value as RunFileChangeStatus : "available";
const sourceTool = (value: unknown): RunFileChangeSourceTool => SOURCE_TOOL_VALUES.includes(value as RunFileChangeSourceTool) ? value as RunFileChangeSourceTool : "generated_output";
const artifactType = (value: unknown): RunFileChangeArtifactType => ARTIFACT_TYPE_VALUES.includes(value as RunFileChangeArtifactType) ? value as RunFileChangeArtifactType : "file";

type ProjectionContext = { runId: string; memoryDir: string | null; workspaceRootPath: string | null };
type AgentNodeLocation = { node: TeamRunAgentNode; scope: AgentMemoryScope };

export class RunFileChangeService {
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memoryLocations: AgentMemoryLocationService;
  private readonly projections = new Map<string, RunFileChangeProjection>();
  private readonly queues = new Map<string, Promise<void>>();

  constructor(options: { projectionStore?: RunFileChangeProjectionStore; workspaceManager?: WorkspaceManager; memoryDir?: string; memoryLocationService?: AgentMemoryLocationService } = {}) {
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.memoryLocations = options.memoryLocationService ?? (options.memoryDir
      ? new AgentMemoryLocationService({ memoryDir: options.memoryDir })
      : getAgentMemoryLocationService());
  }

  attachToRun(run: AgentRun): () => void {
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (isAgentRunEvent(event) && event.eventType === AgentRunEventType.FILE_CHANGE) void this.enqueue(this.fromRun(run), event);
    });
    return () => { unsubscribe(); this.clear(run.runId); };
  }

  attachToTeamRun(teamRun: TeamRun): () => void {
    const runIds = new Set<string>();
    const unsubscribe = teamRun.subscribeToEvents((event) => {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
      if (event.payload.eventType !== "FILE_CHANGE") return;
      const context = this.fromTeamEvent(teamRun, event.execution);
      runIds.add(context.runId);
      void this.enqueue(context, {
        eventType: AgentRunEventType.FILE_CHANGE,
        runId: context.runId,
        statusHint: event.payload.statusHint,
        payload: {
          path: event.payload.details.path,
          type: event.payload.details.fileType,
          status: event.payload.details.status,
          sourceTool: event.payload.details.sourceTool,
          sourceInvocationId: event.payload.details.sourceInvocationId,
          content: event.payload.details.content,
          createdAt: event.payload.details.createdAt,
          updatedAt: event.payload.details.updatedAt,
        },
      });
    });
    return () => { unsubscribe(); runIds.forEach((runId) => this.clear(runId)); };
  }

  getProjectionForRun(run: AgentRun): Promise<RunFileChangeProjection> { return this.load(this.fromRun(run)); }

  getProjectionForTeamMemberRun(teamRun: TeamRun, agentRunId: string): Promise<RunFileChangeProjection> {
    const location = this.findAgent(teamRun.config.rootTeam, (node) => node.agentRunId === agentRunId);
    if (!location) return this.load({ runId: agentRunId, memoryDir: null, workspaceRootPath: null });
    return this.load(this.contextForAddress(teamRun, {
      rootTeamRunId: teamRun.config.rootTeam.teamRunId,
      taskTeamRunIds: [], memberAddress: location.node.address, taskAgentRunId: null,
    }, agentRunId));
  }

  private enqueue(context: ProjectionContext, event: AgentRunEvent): Promise<void> {
    const previous = this.queues.get(context.runId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      try { await this.handle(context, event); }
      catch (error) { logger.warn(`RunFileChangeService failed for '${context.runId}': ${String(error)}`); }
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
      runId: context.runId, workspaceRootPath: context.workspaceRootPath, preferTransientContentOnTie: true,
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
      path: normalizeRunFileChangePath(canonicalPath), type: artifactType(raw.type), status: status(raw.status),
      sourceTool: sourceTool(raw.sourceTool), sourceInvocationId: optional(raw.sourceInvocationId),
      createdAt: timestamp(raw.createdAt, updatedAt), updatedAt,
    };
    if (typeof raw.content === "string" || raw.content === null) entry.content = raw.content;
    return entry;
  }

  private fromRun(run: AgentRun): ProjectionContext {
    return { runId: run.runId, memoryDir: run.config.memoryDir, workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager) };
  }

  private fromTeamEvent(teamRun: TeamRun, execution: TeamAgentExecutionBinding): ProjectionContext {
    const address = execution.executionAddress;
    const configured = this.findAgent(teamRun.config.rootTeam, (node) => node.address === address.memberAddress);
    const runId = execution.kind === "task_team_agent"
      ? execution.agentRunId
      : address.taskAgentRunId ?? configured?.node.agentRunId ?? "unresolved-team-agent";
    return this.contextForAddress(teamRun, address, runId);
  }

  private contextForAddress(teamRun: TeamRun, address: TeamExecutionAddress, runId: string): ProjectionContext {
    const location = this.findAgent(teamRun.config.rootTeam, (node) => node.address === address.memberAddress);
    if (!location) return { runId, memoryDir: null, workspaceRootPath: null };
    const logicalLocation = this.memoryLocations.getTeamAgentRunLocation({ ...location.scope, agentRunId: location.node.agentRunId });
    const memoryDir = address.taskAgentRunId
      ? this.memoryLocations.getTaskAgentLocation({ logicalMemberLocation: logicalLocation, taskAgentRunId: address.taskAgentRunId, executionAddress: address }).memoryDir
      : logicalLocation.memoryDir;
    return { runId, memoryDir, workspaceRootPath: location.node.workspaceRootPath };
  }

  private findAgent(team: TeamRunAgentTeamNode, predicate: (node: TeamRunAgentNode) => boolean, scope: AgentMemoryScope = {
    rootTeamRunId: team.teamRunId, ancestorTeamRunIds: [],
  }): AgentNodeLocation | null {
    for (const node of team.children) {
      if (node.kind === "agent" && predicate(node)) return { node, scope };
      if (node.kind === "agent_team") {
        const nested = this.findAgent(node, predicate, {
          rootTeamRunId: scope.rootTeamRunId,
          ancestorTeamRunIds: [...scope.ancestorTeamRunIds, node.teamRunId],
        });
        if (nested) return nested;
      }
    }
    return null;
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
export const getRunFileChangeService = (): RunFileChangeService =>
  cachedRunFileChangeService ??= new RunFileChangeService();
