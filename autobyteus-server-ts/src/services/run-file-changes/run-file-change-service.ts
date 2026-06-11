import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type {
  TeamMemberRunConfig,
  TeamRunMemberConfig,
} from "../../agent-team-execution/domain/team-run-config.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
} from "../../agent-team-execution/domain/team-run-event.js";
import type { TaskAgentInstanceIdentity } from "../../agent-team-execution/domain/task-agent-instance.js";
import type { AgentMemoryScope } from "../../agent-memory/domain/agent-memory-location.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
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

type RunFileChangeProjectionContext = {
  runId: string;
  memoryDir: string | null;
  workspaceRootPath: string | null;
};

type TeamMemberConfigResolution = {
  config: TeamMemberRunConfig;
  memoryScope: AgentMemoryScope;
};

export class RunFileChangeService {
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memoryLocationService: AgentMemoryLocationService;
  private readonly projectionByRunId = new Map<string, RunFileChangeProjection>();
  private readonly operationQueueByRunId = new Map<string, Promise<void>>();

  constructor(options: {
    projectionStore?: RunFileChangeProjectionStore;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
    memoryLocationService?: AgentMemoryLocationService;
  } = {}) {
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.memoryLocationService =
      options.memoryLocationService ??
      (options.memoryDir
        ? new AgentMemoryLocationService({ memoryDir: options.memoryDir })
        : getAgentMemoryLocationService());
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
    return this.loadProjection(this.buildProjectionContextFromRun(run));
  }

  async getProjectionForTeamMemberRun(
    teamRun: TeamRun,
    memberRunId: string,
  ): Promise<RunFileChangeProjection> {
    return this.loadProjection(
      this.buildProjectionContextFromTeamMemberRun(teamRun, memberRunId),
    );
  }

  private enqueueRunEvent(run: AgentRun, event: AgentRunEvent): Promise<void> {
    return this.enqueueProjectionEvent(
      this.buildProjectionContextFromRun(run),
      event,
    );
  }

  attachToTeamRun(teamRun: TeamRun): () => void {
    const subscribedRunIds = new Set<string>();
    const unsubscribe = teamRun.subscribeToEvents((event) => {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
        return;
      }
      const payload = event.data as TeamRunAgentEventPayload;
      const agentEvent = payload.agentEvent;
      if (!isAgentRunEvent(agentEvent) || agentEvent.eventType !== AgentRunEventType.FILE_CHANGE) {
        return;
      }
      const context = this.buildProjectionContextFromTeamEvent(teamRun, payload);
      subscribedRunIds.add(context.runId);
      void this.enqueueProjectionEvent(context, agentEvent);
    });

    return () => {
      unsubscribe();
      for (const runId of subscribedRunIds) {
        this.projectionByRunId.delete(runId);
        this.operationQueueByRunId.delete(runId);
      }
    };
  }

  private enqueueProjectionEvent(
    context: RunFileChangeProjectionContext,
    event: AgentRunEvent,
  ): Promise<void> {
    const previous = this.operationQueueByRunId.get(context.runId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.handleFileChangeEvent(context, event);
        } catch (error) {
          logger.warn(
            `RunFileChangeService: failed processing '${event.eventType}' for run '${context.runId}': ${String(error)}`,
          );
        }
      });

    this.operationQueueByRunId.set(context.runId, next);
    void next.finally(() => {
      if (this.operationQueueByRunId.get(context.runId) === next) {
        this.operationQueueByRunId.delete(context.runId);
      }
    });
    return next;
  }

  private async handleFileChangeEvent(
    context: RunFileChangeProjectionContext,
    event: AgentRunEvent,
  ): Promise<void> {
    const projection = await this.loadProjection(context);
    const before = JSON.stringify(projection);
    const entry = this.normalizeLiveEntry(context, event.payload);
    if (!entry) {
      return;
    }

    this.upsertEntry(projection, entry);

    const after = JSON.stringify(projection);
    if (before === after) {
      return;
    }

    this.projectionByRunId.set(context.runId, projection);
    if (context.memoryDir) {
      await this.projectionStore.writeProjection(context.memoryDir, projection);
    }
  }

  private async loadProjection(
    context: RunFileChangeProjectionContext,
  ): Promise<RunFileChangeProjection> {
    const cached = this.projectionByRunId.get(context.runId);
    if (cached) {
      return cloneRunFileChangeProjection(cached);
    }

    const loadedProjection =
      context.memoryDir
        ? await this.projectionStore.readProjection(context.memoryDir)
        : { ...EMPTY_RUN_FILE_CHANGE_PROJECTION, entries: [] };
    const normalizedProjection = normalizeRunFileChangeProjection(loadedProjection, {
      runId: context.runId,
      workspaceRootPath: context.workspaceRootPath,
      preferTransientContentOnTie: true,
    });

    this.projectionByRunId.set(context.runId, normalizedProjection);
    return cloneRunFileChangeProjection(normalizedProjection);
  }

  private normalizeLiveEntry(
    context: RunFileChangeProjectionContext,
    rawEntry: Record<string, unknown>,
  ): RunFileChangeEntry | null {
    const canonicalPath = canonicalizeRunFileChangePath(
      normalizeOptionalString(rawEntry.path),
      context.workspaceRootPath,
    );
    if (!canonicalPath) {
      return null;
    }

    const createdAtFallback = new Date().toISOString();
    const updatedAt = normalizeTimestamp(rawEntry.updatedAt, createdAtFallback);
    const createdAt = normalizeTimestamp(rawEntry.createdAt, updatedAt);
    const entry: RunFileChangeEntry = {
      id: buildRunFileChangeId(context.runId, canonicalPath),
      runId: context.runId,
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

  private buildProjectionContextFromRun(run: AgentRun): RunFileChangeProjectionContext {
    return {
      runId: run.runId,
      memoryDir: run.config.memoryDir,
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager),
    };
  }

  private buildProjectionContextFromTeamEvent(
    teamRun: TeamRun,
    payload: TeamRunAgentEventPayload,
  ): RunFileChangeProjectionContext {
    return this.buildProjectionContextFromTeamMemberRun(teamRun, payload.memberRunId, {
      memberName: payload.memberName,
      taskAgentInstance: payload.taskAgentInstance ?? null,
    });
  }

  private buildProjectionContextFromTeamMemberRun(
    teamRun: TeamRun,
    memberRunId: string,
    input: {
      memberName?: string | null;
      taskAgentInstance?: TaskAgentInstanceIdentity | null;
    } = {},
  ): RunFileChangeProjectionContext {
    const normalizedMemberRunId =
      normalizeOptionalString(memberRunId)
      ?? normalizeOptionalString(input.memberName)
      ?? teamRun.runId;
    const logicalMemberRunId = normalizeOptionalString(
      input.taskAgentInstance?.logicalMember.templateMemberRunId ?? null,
    );
    const memberResolution = this.resolveTeamMemberConfig(
      teamRun,
      logicalMemberRunId ?? normalizedMemberRunId,
      input.taskAgentInstance?.logicalMember.memberRouteKey ?? input.memberName,
    );
    const memberConfig = memberResolution?.config ?? null;
    const workspaceRootPath =
      normalizeOptionalString(memberConfig?.workspaceRootPath)
      ?? this.resolveWorkspaceRootPath(memberConfig?.workspaceId);
    const memoryScope = memberResolution?.memoryScope ?? this.getTeamRunMemoryScope(teamRun);
    const memoryDir = input.taskAgentInstance && logicalMemberRunId
      ? this.memoryLocationService.getTaskAgentLocation({
          logicalMemberLocation: this.memoryLocationService.getTeamAgentRunLocation({
            rootTeamRunId: memoryScope.rootTeamRunId,
            teamRunPath: memoryScope.teamRunPath,
            agentRunId: logicalMemberRunId,
          }),
          taskAgentRunId: normalizedMemberRunId,
          logicalMemberRunId,
          logicalMemberRouteKey: input.taskAgentInstance.logicalMember.memberRouteKey,
        }).memoryDir
      : normalizeOptionalString(memberConfig?.memoryDir)
        ?? this.memoryLocationService.getTeamAgentRunLocation({
          rootTeamRunId: memoryScope.rootTeamRunId,
          teamRunPath: memoryScope.teamRunPath,
          agentRunId: normalizedMemberRunId,
        }).memoryDir;

    return {
      runId: normalizedMemberRunId,
      memoryDir,
      workspaceRootPath,
    };
  }

  private resolveTeamMemberConfig(
    teamRun: TeamRun,
    memberRunId: string,
    memberName?: string | null,
  ): TeamMemberConfigResolution | null {
    const visit = (
      members: readonly TeamRunMemberConfig[],
      memoryScope: AgentMemoryScope,
    ): TeamMemberConfigResolution | null => {
      for (const member of members) {
        if (member.memberKind === "agent") {
          if (
            member.memberRunId === memberRunId ||
            member.memberName === memberName ||
            member.memberRouteKey === memberName
          ) {
            return { config: member, memoryScope };
          }
          continue;
        }
        const childTeamRunId =
          normalizeOptionalString(member.childTeamRunId) ??
          normalizeOptionalString(member.memberRunId);
        if (!childTeamRunId) {
          continue;
        }
        const nested = visit(member.memberConfigs, {
          rootTeamRunId: memoryScope.rootTeamRunId,
          teamRunPath: [...memoryScope.teamRunPath, childTeamRunId],
        });
        if (nested) {
          return nested;
        }
      }
      return null;
    };
    return teamRun.config ? visit(teamRun.config.memberTree, this.getTeamRunMemoryScope(teamRun)) : null;
  }

  private getTeamRunMemoryScope(teamRun: TeamRun): AgentMemoryScope {
    const runtimeContext = teamRun.getRuntimeContext();
    const memoryScope = runtimeContext?.parentBoundary?.memoryScope;
    return memoryScope
      ? {
          rootTeamRunId: memoryScope.rootTeamRunId,
          teamRunPath: [...memoryScope.teamRunPath],
        }
      : { rootTeamRunId: teamRun.runId, teamRunPath: [] };
  }

  private resolveWorkspaceRootPath(workspaceId: string | null | undefined): string | null {
    const normalizedWorkspaceId = normalizeOptionalString(workspaceId);
    if (!normalizedWorkspaceId) {
      return null;
    }
    try {
      return this.workspaceManager.getWorkspaceById(normalizedWorkspaceId)?.getBasePath() ?? null;
    } catch (error) {
      logger.warn(
        `RunFileChangeService: failed resolving workspace '${normalizedWorkspaceId}': ${String(error)}`,
      );
      return null;
    }
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
