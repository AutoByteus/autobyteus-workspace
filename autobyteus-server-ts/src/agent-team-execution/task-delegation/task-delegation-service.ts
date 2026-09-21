import { RootTaskLifecycleEngine } from "../../agent-collaboration/execution/task/root-task-lifecycle-engine.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
  TaskDelegationContext,
} from "./task-delegation-record.js";
import type { TaskDelegationRecordsSnapshot } from "./task-delegation-record-v1.js";
import type { TaskDelegationServiceOptions } from "./task-delegation-service-contract.js";
import { TeamTaskLifecycleAdapter } from "./team-task-lifecycle-adapter.js";

/** Team-private facade over the root-neutral task lifecycle engine. */
export class TaskDelegationService {
  private readonly engine: RootTaskLifecycleEngine<ResolvedTeamRecipient>;

  constructor(options: TaskDelegationServiceOptions) {
    this.engine = new RootTaskLifecycleEngine(new TeamTaskLifecycleAdapter(options));
  }

  getSnapshot(rootTeamRunId: string): TaskDelegationRecordsSnapshot {
    return Object.freeze({ schemaVersion: 1, rootTeamRunId, records: this.engine.getRecords() });
  }
  hasOpenWork(): boolean { return this.engine.hasOpenWork(); }
  closeExternalAdmission(): void { this.engine.closeExternalAdmission(); }
  enterRootFailStop(): void { this.engine.enterRootFailStop(); }
  drain(): Promise<void> { return this.engine.drain(); }
  shutdownAndSettle(reason: string): Promise<void> { return this.engine.shutdownAndSettle(reason); }

  onRootEvent(event: TeamRunEvent): void {
    if (event.eventSourceType === TeamRunEventSourceType.AGENT
      && event.payload.eventType === "AGENT_STATUS"
      && (event.payload.details.status === "idle" || event.payload.details.status === "offline")) {
      this.engine.onExecutionBecameIdle();
    }
  }

  delegateTask(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: ResolvedTeamRecipient,
  ): Promise<DelegateTaskResult> {
    return this.engine.delegateTask(context, input, placement);
  }
  submitTaskResult(context: TaskDelegationContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    return this.engine.submitTaskResult(context, input);
  }
  reviewTaskResult(context: TaskDelegationContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    return this.engine.reviewTaskResult(context, input);
  }
  interrupt(taskId: string, reason: string): Promise<void> { return this.engine.interrupt(taskId, reason); }
  settle(taskId: string): Promise<void> { return this.engine.settle(taskId); }
}
