import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TaskExecutionReleaseOutcome } from "../../agent-collaboration/execution/task/task-execution-lifetime.js";
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
    this.lifecycle = new RootTaskExecutionLifecycle(new TeamTaskExecutionAdapter(options), { ...options.idleShutdown, lifetimePort: options.lifetimePort });
  }

  assertInputAllowed(id: string): void { this.lifecycle.assertInputAllowed(id); }
  assertMessageScope(sender: string, recipient: string): void { this.lifecycle.assertMessageScope(sender, recipient); }
  lifetimeForAgent(id: string) { return this.lifecycle.lifetimeForAgent(id); }
  ensureLifetimeHelper(context: TaskDelegationContext, address: string, placement: TeamDelegationPlacement) {
    return this.lifecycle.ensureLifetimeHelper(context, address, placement);
  }
  helperPlacement(id: string, address: string) { return this.lifecycle.helperPlacement(id, address); }
  recordMessageAccepted(id: string): Promise<void> { return this.lifecycle.recordMessageAccepted(id); }
  releaseTaskLifetime(id: string, refs: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionReleaseOutcome[]> {
    return this.lifecycle.releaseTaskLifetime(id, refs);
  }

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

  withLiveLease(id: string, operation: () => Promise<AgentOperationResult>, recordMessage = true): Promise<AgentOperationResult> {
    return this.lifecycle.withLiveLease(id, operation, recordMessage);
  }

  acquireLiveLease(agentRunId: string): Promise<TaskExecutionLiveLease> {
    return this.lifecycle.acquireLiveLease(agentRunId);
  }
}
