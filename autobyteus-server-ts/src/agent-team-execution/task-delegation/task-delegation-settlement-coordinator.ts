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
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
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
  const executionRunId = payload.executionAddress.taskAgentRunId?.trim();
  if (executionRunId) return executionRunId;
  const eventRunId = payload.agentEvent.runId?.trim();
  return eventRunId || null;
};

const isIdleAgentEvent = (event: AgentRunEvent): boolean => {
  if (event.eventType !== AgentRunEventType.AGENT_STATUS) return false;
  const status = normalizeAgentApiStatus(event.payload.status);
  return status === "idle" || status === "offline";
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
      coordinatorAddress?: AgentTeamAddress | null;
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
    const taskAgentRunId = taskAgentInstance.taskAgentRunId.trim();
    const directoryEntry = this.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    if (!directoryEntry || this.isProtectedMember(directoryEntry.memberAddress)) {
      return false;
    }
    if (!taskAgentRunId) {
      this.pendingByTaskAgentRunId.delete(taskAgentRunId);
      return false;
    }
    this.pendingByTaskAgentRunId.set(taskAgentRunId, {
      taskAgentInstance: cloneTaskAgentInstanceIdentity(taskAgentInstance),
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
    const payload = event.data as TeamRunAgentEventPayload;
    if (!isIdleAgentEvent(payload.agentEvent)) {
      this.idleTaskAgentRunIds.delete(taskAgentRunId);
      return;
    }
    this.idleTaskAgentRunIds.add(taskAgentRunId);
    await this.settleIfReady(taskAgentRunId);
  }

  private async settleIfReady(taskAgentRunId: string): Promise<void> {
    const pending = this.pendingByTaskAgentRunId.get(taskAgentRunId);
    if (!pending) {
      return;
    }
    if (this.ledger.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId)) {
      return;
    }
    const directoryEntry = this.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    if (!directoryEntry) return;
    this.pendingByTaskAgentRunId.delete(taskAgentRunId);
    const result = await this.teamRun.settleTaskAgentInstance(
      directoryEntry.memberAddress,
      pending.taskAgentInstance.taskAgentRunId,
      `task_delegation_idle_after_${pending.requestedAt}`,
    );
    if (!result.accepted) {
      console.warn(
        `TaskDelegationSettlementCoordinator: settlement rejected for '${directoryEntry.memberAddress}': ${result.message ?? "unknown error"}`,
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

  private isProtectedMember(address: AgentTeamAddress): boolean {
    if (this.options.allowCoordinatorSettlement === true) {
      return false;
    }
    return Boolean(this.options.coordinatorAddress) && this.options.coordinatorAddress === address;
  }
}
