import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
  type TeamRunEventUnsubscribe,
} from "../domain/team-run-event.js";
import { buildMemberRouteKeyFromPath } from "../domain/team-run-member-identity.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { cloneTaskAgentIdentity } from "./task-agent-instance-identity.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";

type PendingSettlement = {
  taskAgentInstance: TaskAgentInstanceIdentity;
  requestedAt: string;
};

const eventTaskAgentRunId = (event: TeamRunEvent): string | null => {
  if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return null;
  }
  const payload = event.data as TeamRunAgentEventPayload;
  const taskAgentRunId = payload.taskAgentInstance?.taskAgentRunId?.trim();
  if (taskAgentRunId) {
    return taskAgentRunId;
  }
  const memberRunId = payload.memberRunId?.trim();
  if (memberRunId) {
    return memberRunId;
  }
  const eventRunId = payload.agentEvent.runId?.trim();
  return eventRunId || null;
};

const eventMemberRouteKey = (event: TeamRunEvent): string | null => {
  if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return null;
  }
  const payload = event.data as TeamRunAgentEventPayload;
  const taskAgentRoute = payload.taskAgentInstance?.logicalMember.memberRouteKey?.trim();
  if (taskAgentRoute) {
    return taskAgentRoute;
  }
  const fromPayload = payload.memberRouteKey?.trim();
  if (fromPayload) {
    return fromPayload;
  }
  return event.sourcePath.length > 0
    ? buildMemberRouteKeyFromPath(event.sourcePath)
    : null;
};

const isIdleAgentEvent = (event: AgentRunEvent): boolean => {
  if (event.eventType === AgentRunEventType.AGENT_STATUS) {
    const status = normalizeAgentApiStatus(event.payload.status);
    return status === "idle" || status === "offline";
  }
  return event.statusHint === "IDLE";
};

export class TaskDelegationSettlementCoordinator {
  private readonly pendingByTaskAgentRunId = new Map<string, PendingSettlement>();
  private readonly idleTaskAgentRunIds = new Set<string>();
  private unsubscribe: TeamRunEventUnsubscribe | null = null;

  constructor(
    private readonly teamRun: TeamRun,
    private readonly ledger: TaskDelegationLedger,
    private readonly taskAgentDirectory: TaskAgentDirectory,
    private readonly options: {
      coordinatorMemberRouteKey?: string | null;
      allowCoordinatorSettlement?: boolean;
    } = {},
  ) {}

  attach(): void {
    if (this.unsubscribe) {
      return;
    }
    this.unsubscribe = this.teamRun.subscribeToEvents((event) => {
      void this.handleTeamRunEvent(event);
    });
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pendingByTaskAgentRunId.clear();
    this.idleTaskAgentRunIds.clear();
  }

  requestSettlement(taskAgentInstance: TaskAgentInstanceIdentity | null): boolean {
    if (!taskAgentInstance) {
      return false;
    }
    const routeKey = taskAgentInstance.logicalMember.memberRouteKey.trim();
    const taskAgentRunId = taskAgentInstance.taskAgentRunId.trim();
    if (!routeKey || this.isProtectedMember(routeKey)) {
      return false;
    }
    if (!taskAgentRunId) {
      this.pendingByTaskAgentRunId.delete(taskAgentRunId);
      return false;
    }
    this.pendingByTaskAgentRunId.set(taskAgentRunId, {
      taskAgentInstance: cloneTaskAgentIdentity(taskAgentInstance),
      requestedAt: new Date().toISOString(),
    });
    if (this.idleTaskAgentRunIds.has(taskAgentRunId)) {
      void this.settleIfReady(taskAgentRunId);
    }
    void this.settleIdlePendingIfReady();
    return true;
  }

  private async handleTeamRunEvent(event: TeamRunEvent): Promise<void> {
    const taskAgentRunId = eventTaskAgentRunId(event);
    if (!taskAgentRunId) {
      return;
    }
    const routeKey = eventMemberRouteKey(event);
    const payload = event.data as TeamRunAgentEventPayload;
    if (!isIdleAgentEvent(payload.agentEvent)) {
      this.idleTaskAgentRunIds.delete(taskAgentRunId);
      return;
    }
    this.idleTaskAgentRunIds.add(taskAgentRunId);
    await this.settleIfReady(taskAgentRunId, routeKey);
  }

  private async settleIfReady(taskAgentRunId: string, eventRouteKey?: string | null): Promise<void> {
    const pending = this.pendingByTaskAgentRunId.get(taskAgentRunId);
    if (!pending) {
      return;
    }
    if (eventRouteKey && eventRouteKey !== pending.taskAgentInstance.logicalMember.memberRouteKey) {
      return;
    }
    if (this.ledger.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId)) {
      return;
    }
    this.pendingByTaskAgentRunId.delete(taskAgentRunId);
    const result = await this.teamRun.settleTaskAgentInstance(
      pending.taskAgentInstance.logicalMember.memberRouteKey,
      pending.taskAgentInstance.taskAgentRunId,
      `task_delegation_idle_after_${pending.requestedAt}`,
    );
    if (!result.accepted) {
      console.warn(
        `TaskDelegationSettlementCoordinator: settlement rejected for '${pending.taskAgentInstance.logicalMember.memberRouteKey}': ${result.message ?? "unknown error"}`,
      );
    } else {
      this.taskAgentDirectory.markSettledByTaskAgentRunId(taskAgentRunId);
    }
    this.idleTaskAgentRunIds.delete(taskAgentRunId);
  }

  private async settleIdlePendingIfReady(): Promise<void> {
    const idleRunIds = [...this.idleTaskAgentRunIds];
    for (const taskAgentRunId of idleRunIds) {
      await this.settleIfReady(taskAgentRunId);
    }
  }

  private isProtectedMember(routeKey: string): boolean {
    if (this.options.allowCoordinatorSettlement === true) {
      return false;
    }
    const coordinatorRouteKey = this.options.coordinatorMemberRouteKey?.trim();
    return Boolean(coordinatorRouteKey) && coordinatorRouteKey === routeKey;
  }
}
