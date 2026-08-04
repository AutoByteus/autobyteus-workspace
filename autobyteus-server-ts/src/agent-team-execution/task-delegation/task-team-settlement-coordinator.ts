import type { TeamRun } from "../domain/team-run.js";
import type { TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { cloneTaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { getTaskAgentDirectory } from "./task-agent-directory.js";
import type { TaskTeamActiveRunDirectory } from "./task-team-active-run-directory.js";
import type { TaskDelegationRunRegistry } from "./task-delegation-run-registry.js";

type PendingTeamSettlement = {
  taskTeamInstance: TaskTeamInstanceIdentity;
  requestedAt: string;
  status: "settlement_requested" | "settling" | "settled";
};

export class TaskTeamSettlementCoordinator {
  private readonly pendingByTaskTeamRunId = new Map<string, PendingTeamSettlement>();
  private readonly subscriptionsByTaskTeamRunId = new Map<string, TeamRunEventUnsubscribe>();

  constructor(private readonly dependencies: {
    parentTeamRun: TeamRun;
    taskTeamDirectory: TaskTeamActiveRunDirectory;
    runRegistry: TaskDelegationRunRegistry;
  }) {}

  requestSettlement(taskTeamInstance: TaskTeamInstanceIdentity | null): boolean {
    if (!taskTeamInstance) return false;
    const taskTeamRunId = taskTeamInstance.taskTeamRunId.trim();
    if (!taskTeamRunId) return false;
    this.pendingByTaskTeamRunId.set(taskTeamRunId, {
      taskTeamInstance: cloneTaskTeamInstanceIdentity(taskTeamInstance),
      requestedAt: new Date().toISOString(),
      status: this.pendingByTaskTeamRunId.get(taskTeamRunId)?.status ?? "settlement_requested",
    });
    this.subscribeToChildEvents(taskTeamRunId);
    void this.settleIfReady(taskTeamRunId);
    return true;
  }

  detach(): void {
    for (const unsubscribe of this.subscriptionsByTaskTeamRunId.values()) unsubscribe();
    this.subscriptionsByTaskTeamRunId.clear();
    this.pendingByTaskTeamRunId.clear();
  }

  private async settleIfReady(taskTeamRunId: string): Promise<void> {
    const pending = this.pendingByTaskTeamRunId.get(taskTeamRunId);
    if (!pending) return;
    if (pending.status === "settling" || pending.status === "settled") return;
    const entry = this.dependencies.taskTeamDirectory.resolveKnownEntryByTaskTeamRunId(taskTeamRunId);
    if (!entry?.activeRun) return;
    this.subscribeToChildEvents(taskTeamRunId);
    if (this.hasOpenChildWork(entry.activeRun)) return;

    pending.status = "settling";
    try {
      const result = await this.dependencies.parentTeamRun.settleTaskTeamInstance(
        entry.memberAddress,
        pending.taskTeamInstance.taskTeamRunId,
        `task_team_delegation_safe_after_${pending.requestedAt}`,
      );
      if (result.accepted) {
        pending.status = "settled";
        this.unsubscribeFromChildEvents(taskTeamRunId);
        this.dependencies.runRegistry.detach(entry.activeRun.teamRunId);
        this.dependencies.taskTeamDirectory.unbind(taskTeamRunId);
      } else {
        pending.status = "settlement_requested";
        console.warn(
          `TaskTeamSettlementCoordinator: settlement rejected for '${taskTeamRunId}': ${result.message ?? "unknown error"}`,
        );
      }
    } catch (error) {
      pending.status = "settlement_requested";
      console.warn(
        `TaskTeamSettlementCoordinator: settlement failed for '${taskTeamRunId}': ${String(error)}`,
      );
    }
  }

  private hasOpenChildWork(childRun: TeamRun): boolean {
    const childService = this.dependencies.runRegistry.getExisting(childRun.teamRunId);
    if (childService?.hasOpenWork()) return true;
    if (getTaskAgentDirectory(childRun.teamRunId).listActiveEntries().length > 0) return true;
    return childRun.hasOpenExecutionWork();
  }

  private subscribeToChildEvents(taskTeamRunId: string): void {
    if (this.subscriptionsByTaskTeamRunId.has(taskTeamRunId)) return;
    const entry = this.dependencies.taskTeamDirectory.resolveKnownEntryByTaskTeamRunId(taskTeamRunId);
    const childRun = entry?.activeRun ?? null;
    if (!childRun) return;
    const unsubscribe = childRun.subscribeToEvents(() => {
      void this.settleIfReady(taskTeamRunId);
    });
    this.subscriptionsByTaskTeamRunId.set(taskTeamRunId, unsubscribe);
  }

  private unsubscribeFromChildEvents(taskTeamRunId: string): void {
    const unsubscribe = this.subscriptionsByTaskTeamRunId.get(taskTeamRunId) ?? null;
    unsubscribe?.();
    this.subscriptionsByTaskTeamRunId.delete(taskTeamRunId);
  }
}
