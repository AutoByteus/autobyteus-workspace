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
import type { TaskDelegationMemberIdentity } from "./task-delegation-record.js";

type PendingSettlement = {
  member: TaskDelegationMemberIdentity;
  requestedAt: string;
};

const eventMemberRouteKey = (event: TeamRunEvent): string | null => {
  if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return null;
  }
  const payload = event.data as TeamRunAgentEventPayload;
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
  private readonly pendingByRouteKey = new Map<string, PendingSettlement>();
  private unsubscribe: TeamRunEventUnsubscribe | null = null;

  constructor(
    private readonly teamRun: TeamRun,
    private readonly ledger: TaskDelegationLedger,
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
    this.pendingByRouteKey.clear();
  }

  requestSettlement(member: TaskDelegationMemberIdentity): boolean {
    const routeKey = member.memberRouteKey.trim();
    if (!routeKey || this.isProtectedMember(routeKey)) {
      return false;
    }
    if (this.ledger.hasCurrentWorkForAssignee(routeKey)) {
      this.pendingByRouteKey.delete(routeKey);
      return false;
    }
    this.pendingByRouteKey.set(routeKey, {
      member: {
        ...member,
        memberPath: [...member.memberPath],
      },
      requestedAt: new Date().toISOString(),
    });
    return true;
  }

  private async handleTeamRunEvent(event: TeamRunEvent): Promise<void> {
    const routeKey = eventMemberRouteKey(event);
    if (!routeKey) {
      return;
    }
    const pending = this.pendingByRouteKey.get(routeKey);
    if (!pending) {
      return;
    }
    const payload = event.data as TeamRunAgentEventPayload;
    if (!isIdleAgentEvent(payload.agentEvent)) {
      return;
    }
    if (this.ledger.hasCurrentWorkForAssignee(routeKey)) {
      this.pendingByRouteKey.delete(routeKey);
      return;
    }
    this.pendingByRouteKey.delete(routeKey);
    const result = await this.teamRun.settleMember(
      pending.member.memberRouteKey,
      pending.member.memberRunId,
      `task_delegation_idle_after_${pending.requestedAt}`,
    );
    if (!result.accepted) {
      console.warn(
        `TaskDelegationSettlementCoordinator: settlement rejected for '${routeKey}': ${result.message ?? "unknown error"}`,
      );
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
