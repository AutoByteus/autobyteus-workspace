import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
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
    const entry = this.dependencies.taskTeamDirectory.resolveActiveEntryByTaskTeamRunId(taskTeamRunId);
    if (!entry?.activeRun) return;
    this.subscribeToChildEvents(taskTeamRunId);
    if (this.hasOpenChildWork(entry.activeRun)) return;

    const result = await this.dependencies.parentTeamRun.settleTaskTeamInstance(
      pending.taskTeamInstance.logicalTeam.memberRouteKey,
      pending.taskTeamInstance.taskTeamRunId,
      `task_team_delegation_safe_after_${pending.requestedAt}`,
    );
    if (result.accepted) {
      this.pendingByTaskTeamRunId.delete(taskTeamRunId);
      this.unsubscribeFromChildEvents(taskTeamRunId);
      this.dependencies.runRegistry.detach(entry.activeRun.runId);
      this.dependencies.taskTeamDirectory.unbind(taskTeamRunId);
    } else {
      console.warn(
        `TaskTeamSettlementCoordinator: settlement rejected for '${taskTeamRunId}': ${result.message ?? "unknown error"}`,
      );
    }
  }

  private hasOpenChildWork(childRun: TeamRun): boolean {
    const childService = this.dependencies.runRegistry.getExisting(childRun.runId);
    if (childService?.hasOpenWork()) return true;
    if (getTaskAgentDirectory(childRun.runId).listActiveEntries().length > 0) return true;
    const status = normalizeAgentApiStatus(childRun.getStatusSnapshot().status);
    return status !== "idle" && status !== "offline";
  }

  private subscribeToChildEvents(taskTeamRunId: string): void {
    if (this.subscriptionsByTaskTeamRunId.has(taskTeamRunId)) return;
    const entry = this.dependencies.taskTeamDirectory.resolveActiveEntryByTaskTeamRunId(taskTeamRunId);
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
