import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../domain/team-run-event.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { buildMemberRouteKeyFromPath } from "../domain/team-run-member-identity.js";
import {
  buildAgentMemberCommandStartStatusEvent,
  buildAgentMemberCommandStatusPayload,
  buildTeamCommandStartStatusEvent,
} from "./team-member-command-start-status-events.js";

export type TeamCommandStatusMemberIdentity = {
  memberName: string;
  memberRunId: string;
  memberPath: readonly string[];
  memberRouteKey: string;
};

export class TeamCommandStatusOverlayStore {
  private readonly memberStatusesByExecutionKey = new Map<string, AgentStatusPayload>();
  private readonly teamStatusesBySourcePathKey = new Map<string, AgentApiStatus>();

  constructor(private readonly options: {
    getTeamRunId: () => string | null;
    publishEvent: (event: TeamRunEvent) => void;
    publishTeamStatusIfChanged: () => void;
  }) {}

  publishMemberCommandStatus(input: {
    runtimeKind: RuntimeKind;
    memberContext: TeamCommandStatusMemberIdentity;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    currentStatus: () => unknown;
    status: "initializing" | "error";
    errorMessage?: string | null;
    notifyStatusChange?: boolean;
  }): boolean {
    if (!this.canPublish(input.status, input.currentStatus)) {
      return false;
    }
    const teamRunId = this.options.getTeamRunId();
    if (!teamRunId) {
      return false;
    }

    const eventInput = {
      teamRunId,
      runtimeKind: input.runtimeKind,
      memberName: input.memberContext.memberName,
      memberRunId: input.memberContext.memberRunId,
      memberPath: [...input.memberContext.memberPath],
      memberRouteKey: input.memberContext.memberRouteKey,
      taskAgentInstance: input.taskAgentInstance ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    };
    this.memberStatusesByExecutionKey.set(
      this.memberStatusExecutionKey({
        memberRouteKey: input.memberContext.memberRouteKey,
        taskAgentRunId: input.taskAgentInstance?.taskAgentRunId ?? null,
      }),
      buildAgentMemberCommandStatusPayload(eventInput),
    );
    this.options.publishEvent(buildAgentMemberCommandStartStatusEvent(eventInput));
    if (input.notifyStatusChange !== false) {
      this.options.publishTeamStatusIfChanged();
    }
    return true;
  }

  publishTeamCommandStatus(input: {
    sourcePath: readonly string[];
    currentStatus: () => unknown;
    status: "initializing" | "error";
    errorMessage?: string | null;
    notifyStatusChange?: boolean;
  }): boolean {
    if (!this.canPublish(input.status, input.currentStatus)) {
      return false;
    }
    const teamRunId = this.options.getTeamRunId();
    if (!teamRunId) {
      return false;
    }

    const sourcePath = [...input.sourcePath];
    this.teamStatusesBySourcePathKey.set(this.sourcePathKey(sourcePath), input.status);
    this.options.publishEvent(buildTeamCommandStartStatusEvent({
      teamRunId,
      sourcePath,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    }));
    if (input.notifyStatusChange !== false) {
      this.options.publishTeamStatusIfChanged();
    }
    return true;
  }

  getMemberStatusSnapshot(input: {
    memberContext: TeamCommandStatusMemberIdentity;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    fallback: () => AgentStatusPayload;
  }): AgentStatusPayload {
    return this.memberStatusesByExecutionKey.get(this.memberStatusExecutionKey({
      memberRouteKey: input.memberContext.memberRouteKey,
      taskAgentRunId: input.taskAgentInstance?.taskAgentRunId ?? null,
    }))
      ?? input.fallback();
  }

  applyMemberStatusOverlays(snapshots: AgentStatusPayload[]): AgentStatusPayload[] {
    if (this.memberStatusesByExecutionKey.size === 0) {
      return snapshots;
    }

    const appliedExecutionKeys = new Set<string>();
    const resolved = snapshots.map((snapshot) => {
      const executionKey = this.resolveSnapshotExecutionKey(snapshot);
      if (!executionKey) {
        return snapshot;
      }
      const overlay = this.memberStatusesByExecutionKey.get(executionKey);
      if (!overlay) {
        return snapshot;
      }
      appliedExecutionKeys.add(executionKey);
      return { ...snapshot, status: overlay.status, can_interrupt: overlay.can_interrupt };
    });

    for (const [executionKey, overlay] of this.memberStatusesByExecutionKey.entries()) {
      if (!appliedExecutionKeys.has(executionKey)) {
        resolved.push(overlay);
      }
    }
    return resolved;
  }

  getTeamStatus(input: {
    sourcePath: readonly string[];
    fallbackStatus: () => unknown;
  }): AgentApiStatus {
    const overlay = this.teamStatusesBySourcePathKey.get(this.sourcePathKey(input.sourcePath));
    return overlay ?? normalizeAgentApiStatus(input.fallbackStatus());
  }

  getRepresentedTeamStatusSnapshot(input: {
    sourcePath: readonly string[];
    representedMember: TeamCommandStatusMemberIdentity;
    fallback: () => AgentStatusPayload;
  }): AgentStatusPayload {
    const overlay = this.teamStatusesBySourcePathKey.get(this.sourcePathKey(input.sourcePath));
    if (!overlay) {
      return input.fallback();
    }
    return buildAgentStatusPayload({
      status: overlay,
      canInterrupt: false,
      agentId: input.representedMember.memberRunId,
      agentName: input.representedMember.memberName,
      memberRouteKey: input.representedMember.memberRouteKey,
      memberPath: [...input.representedMember.memberPath],
      sourceRouteKey: input.representedMember.memberRouteKey,
      sourcePath: [...input.representedMember.memberPath],
    });
  }

  recordReplacementEvents(events: readonly TeamRunEvent[]): boolean {
    let changed = false;
    for (const event of events) {
      if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
        changed = this.clearMemberReplacement(event) || changed;
      } else if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
        changed = this.clearTeamReplacement(event.sourcePath) || changed;
      }
    }
    return changed;
  }

  clear(): void {
    this.memberStatusesByExecutionKey.clear();
    this.teamStatusesBySourcePathKey.clear();
  }

  private canPublish(
    status: "initializing" | "error",
    currentStatus: () => unknown,
  ): boolean {
    const normalizedCurrentStatus = normalizeAgentApiStatus(currentStatus());
    return status !== "initializing"
      || normalizedCurrentStatus === "offline"
      || normalizedCurrentStatus === "idle";
  }

  private clearMemberReplacement(event: TeamRunEvent): boolean {
    const payload = event.data as TeamRunAgentEventPayload;
    if (payload.agentEvent.eventType !== AgentRunEventType.AGENT_STATUS) {
      return false;
    }

    const taskAgentRunId = this.normalizeIdentity(
      payload.taskAgentInstance?.taskAgentRunId,
    ) ?? this.normalizeIdentity(payload.agentEvent.payload.task_agent_run_id);

    let changed = false;
    if (taskAgentRunId) {
      changed = this.memberStatusesByExecutionKey.delete(
        this.taskAgentExecutionKey(taskAgentRunId),
      ) || changed;
    } else {
      const routeKeys = new Set<string>();
      this.addRouteKey(routeKeys, payload.memberRouteKey);
      this.addRouteKey(routeKeys, payload.agentEvent.payload.member_route_key);
      this.addRouteKey(routeKeys, payload.agentEvent.payload.source_route_key);
      if (Array.isArray(payload.memberPath) && payload.memberPath.length > 0) {
        this.addRouteKey(routeKeys, buildMemberRouteKeyFromPath(payload.memberPath));
      }
      if (Array.isArray(payload.agentEvent.payload.member_path) && payload.agentEvent.payload.member_path.length > 0) {
        this.addRouteKey(routeKeys, buildMemberRouteKeyFromPath(payload.agentEvent.payload.member_path));
      }
      if (Array.isArray(payload.agentEvent.payload.source_path) && payload.agentEvent.payload.source_path.length > 0) {
        this.addRouteKey(routeKeys, buildMemberRouteKeyFromPath(payload.agentEvent.payload.source_path));
      }

      for (const routeKey of routeKeys) {
        changed = this.memberStatusesByExecutionKey.delete(this.logicalMemberExecutionKey(routeKey)) || changed;
      }
    }
    if (changed) {
      return true;
    }

    const identities = new Set<string>();
    this.addIdentity(identities, payload.memberRunId);
    this.addIdentity(identities, payload.agentEvent.runId);
    this.addIdentity(identities, payload.agentEvent.payload.agent_id);
    for (const [executionKey, status] of this.memberStatusesByExecutionKey.entries()) {
      if (status.agent_id && identities.has(status.agent_id)) {
        this.memberStatusesByExecutionKey.delete(executionKey);
        changed = true;
      }
    }
    return changed;
  }

  private clearTeamReplacement(sourcePath: readonly string[]): boolean {
    return this.teamStatusesBySourcePathKey.delete(this.sourcePathKey(sourcePath));
  }

  private resolveSnapshotExecutionKey(snapshot: AgentStatusPayload): string | null {
    if (snapshot.task_agent_run_id) {
      return this.taskAgentExecutionKey(snapshot.task_agent_run_id);
    }
    if (snapshot.member_route_key) {
      return this.logicalMemberExecutionKey(snapshot.member_route_key);
    }
    if (snapshot.source_route_key) {
      return this.logicalMemberExecutionKey(snapshot.source_route_key);
    }
    if (Array.isArray(snapshot.member_path) && snapshot.member_path.length > 0) {
      return this.logicalMemberExecutionKey(buildMemberRouteKeyFromPath(snapshot.member_path));
    }
    if (Array.isArray(snapshot.source_path) && snapshot.source_path.length > 0) {
      return this.logicalMemberExecutionKey(buildMemberRouteKeyFromPath(snapshot.source_path));
    }
    for (const [executionKey, status] of this.memberStatusesByExecutionKey.entries()) {
      if (snapshot.agent_id && status.agent_id === snapshot.agent_id) {
        return executionKey;
      }
    }
    return null;
  }

  private memberStatusExecutionKey(input: {
    memberRouteKey: string;
    taskAgentRunId?: string | null;
  }): string {
    const taskAgentRunId = this.normalizeIdentity(input.taskAgentRunId);
    return taskAgentRunId
      ? this.taskAgentExecutionKey(taskAgentRunId)
      : this.logicalMemberExecutionKey(input.memberRouteKey);
  }

  private taskAgentExecutionKey(taskAgentRunId: string): string {
    return `task-agent:${taskAgentRunId.trim()}`;
  }

  private logicalMemberExecutionKey(memberRouteKey: string): string {
    return `member:${memberRouteKey.trim()}`;
  }

  private sourcePathKey(sourcePath: readonly string[]): string {
    return JSON.stringify([...sourcePath]);
  }

  private addRouteKey(routeKeys: Set<string>, value: unknown): void {
    if (typeof value === "string" && value.trim().length > 0) {
      routeKeys.add(value.trim());
    }
  }

  private addIdentity(identities: Set<string>, value: unknown): void {
    const normalized = this.normalizeIdentity(value);
    if (normalized) {
      identities.add(normalized);
    }
  }

  private normalizeIdentity(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null;
  }
}
