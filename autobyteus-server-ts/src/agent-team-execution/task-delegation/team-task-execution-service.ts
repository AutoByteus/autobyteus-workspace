import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TaskExecutionStopResult } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { RootTaskExecutionLifecycle, type DeliverTaskWork, type TaskExecutionLiveLease } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type {
  AssignToExistingCopyInput,
  SpawnTaskInput,
  TaskDelegationContext,
  TaskDelegationOutcome,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamDelegationPlacement } from "../services/resolved-team-recipient.js";
import type { TeamTaskExecutionServiceOptions } from "./team-task-execution-service-contract.js";
import { TeamTaskExecutionAdapter } from "./team-task-execution-adapter.js";

/** Team-private construction of the root-neutral task-execution lifecycle; forwards root events. */
export class TeamTaskExecutionService {
  private readonly lifecycle: RootTaskExecutionLifecycle<TeamDelegationPlacement>;

  constructor(options: TeamTaskExecutionServiceOptions) {
    this.lifecycle = new RootTaskExecutionLifecycle(new TeamTaskExecutionAdapter(options), { ...options.idleShutdown, taskExecutionResources: options.taskExecutionResources });
  }

  assertInputAllowed(id: string): void { this.lifecycle.assertInputAllowed(id); }
  assertMessageScope(sender: string, recipient: string): void { this.lifecycle.assertMessageScope(sender, recipient); }
  taskOwnerOf(id: string) { return this.lifecycle.taskOwnerOf(id); }
  ensureTaskHelper(context: TaskDelegationContext, address: string, placement: TeamDelegationPlacement) {
    return this.lifecycle.ensureTaskHelper(context, address, placement);
  }
  helperPlacement(id: string, address: string) { return this.lifecycle.helperPlacement(id, address); }
  releaseTaskExecutions(refs: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionStopResult[]> {
    return this.lifecycle.releaseTaskExecutions(refs);
  }
  taskExecutionStatus(ref: TaskExecutionReference): AgentExecutionStatus { return this.lifecycle.taskExecutionStatus(ref); }
  closedTaskExecutions(): readonly TaskExecutionReference[] { return this.lifecycle.closedTaskExecutions(); }

  closeExternalAdmission(): void { this.lifecycle.closeExternalAdmission(); }
  enterRootFailStop(): void { this.lifecycle.enterRootFailStop(); }
  drain(): Promise<void> { return this.lifecycle.drain(); }

  onRootEvent(event: TeamRunEvent): void {
    if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
    if (event.payload.eventType === "AGENT_STATUS") {
      this.lifecycle.onAgentStatus(event.execution.agentRunId, event.payload.details.status);
    } else if (event.payload.eventType === "BACKGROUND_TASK_UPDATED" && event.payload.details.status !== "running") {
      this.lifecycle.onAgentBackgroundTaskEnded(event.execution.agentRunId);
    }
  }

  delegateToNewCopy(context: TaskDelegationContext, input: SpawnTaskInput, placement: TeamDelegationPlacement): Promise<TaskDelegationOutcome> {
    return this.lifecycle.delegateToNewCopy(context, input, placement);
  }
  assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput, deliverWork: DeliverTaskWork): Promise<TaskDelegationOutcome> {
    return this.lifecycle.assignToExistingCopy(context, input, deliverWork);
  }
  teamCoordinatorOf(teamRunId: string): string | null { return this.lifecycle.teamCoordinatorOf(teamRunId); }

  withLiveLease(id: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return this.lifecycle.withLiveLease(id, operation);
  }

  deliverToExactTarget(sender: string, target: string, deliver: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return this.lifecycle.deliverToExactTarget(sender, target, deliver);
  }

  acquireLiveLease(agentRunId: string): Promise<TaskExecutionLiveLease> {
    return this.lifecycle.acquireLiveLease(agentRunId);
  }
}
