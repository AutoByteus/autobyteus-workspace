import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventUnsubscribe,
} from "../domain/team-run-event.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import type { ActiveTaskExecutionBinding } from "./active-task-execution-binding.js";

type PendingSettlement = {
  taskAgentRunId: string;
  requestedAt: string;
};

const eventTaskAgentRunId = (event: TeamRunEvent): string | null => {
  if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return null;
  }
  return event.execution.executionAddress.taskAgentRunId?.trim() || null;
};

const isIdleAgentEvent = (event: TeamRunEvent): boolean =>
  event.eventSourceType === TeamRunEventSourceType.AGENT &&
  event.payload.eventType === "AGENT_STATUS" &&
  (event.payload.details.status === "idle" || event.payload.details.status === "offline");

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

  requestSettlement(binding: ActiveTaskExecutionBinding | null): boolean {
    if (!binding || binding.kind !== "task_agent") {
      return false;
    }
    const taskAgentRunId = binding.executionAddress.taskAgentRunId?.trim() ?? "";
    const directoryEntry = this.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    if (!directoryEntry || this.isProtectedMember(directoryEntry.memberAddress)) {
      return false;
    }
    if (!taskAgentRunId) {
      this.pendingByTaskAgentRunId.delete(taskAgentRunId);
      return false;
    }
    this.pendingByTaskAgentRunId.set(taskAgentRunId, {
      taskAgentRunId,
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
    if (!isIdleAgentEvent(event)) {
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
    const result = await this.teamRun.settleTaskAgentExecution(
      directoryEntry.memberAddress,
      pending.taskAgentRunId,
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
