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
    this.lifecycle = new RootTaskExecutionLifecycle(new TeamTaskExecutionAdapter(options), options.idleShutdown ?? {});
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

  acquireLiveLease(agentRunId: string): Promise<TaskExecutionLiveLease> {
    return this.lifecycle.acquireLiveLease(agentRunId);
  }
}
