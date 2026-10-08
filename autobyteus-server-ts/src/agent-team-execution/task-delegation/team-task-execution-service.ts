import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TaskAgentResourceStopResult } from "../../agent-collaboration/execution/task/task-agent-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { RootTaskExecutionLifecycle, type TaskExecutionLiveLease } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type {
  DelegateTaskInput,
  DelegateTaskResult,
  TaskDelegationContext,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamDelegationPlacement } from "../services/resolved-team-recipient.js";
import type { TeamTaskExecutionServiceOptions } from "./team-task-execution-service-contract.js";
import { TeamTaskExecutionAdapter } from "./team-task-execution-adapter.js";

/** Team-private construction of the root-neutral task-execution lifecycle; forwards root events. */
export class TeamTaskExecutionService {
  private readonly lifecycle: RootTaskExecutionLifecycle<TeamDelegationPlacement>;

  constructor(options: TeamTaskExecutionServiceOptions) {
    this.lifecycle = new RootTaskExecutionLifecycle(new TeamTaskExecutionAdapter(options), { ...options.idleShutdown, taskAgentResources: options.taskAgentResources });
  }

  assertInputAllowed(id: string): void { this.lifecycle.assertInputAllowed(id); }
  assertMessageScope(sender: string, recipient: string): void { this.lifecycle.assertMessageScope(sender, recipient); }
  taskOwnerOf(id: string) { return this.lifecycle.taskOwnerOf(id); }
  ensureTaskHelper(context: TaskDelegationContext, address: string, placement: TeamDelegationPlacement) {
    return this.lifecycle.ensureTaskHelper(context, address, placement);
  }
  helperPlacement(id: string, address: string) { return this.lifecycle.helperPlacement(id, address); }
  releaseTaskAgentResources(refs: readonly TaskExecutionReference[]): Promise<readonly TaskAgentResourceStopResult[]> {
    return this.lifecycle.releaseTaskAgentResources(refs);
  }
  taskExecutionStatus(ref: TaskExecutionReference): AgentExecutionStatus { return this.lifecycle.taskExecutionStatus(ref); }
  closedTaskExecutions(): readonly TaskExecutionReference[] { return this.lifecycle.closedTaskExecutions(); }

  closeExternalAdmission(): void { this.lifecycle.closeExternalAdmission(); }
  enterRootFailStop(): void { this.lifecycle.enterRootFailStop(); }
  drain(): Promise<void> { return this.lifecycle.drain(); }

  onRootEvent(event: TeamRunEvent): void {
    if (event.eventSourceType !== TeamRunEventSourceType.AGENT || event.payload.eventType !== "AGENT_STATUS") return;
    this.lifecycle.onAgentStatus(event.execution.agentRunId, event.payload.details.status);
  }

  delegateTask(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: TeamDelegationPlacement,
  ): Promise<DelegateTaskResult> {
    return this.lifecycle.delegate(context, input, placement);
  }

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
