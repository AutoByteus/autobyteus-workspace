import type { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { TaskDelegationRecordsV1Store } from "../task-delegation/records/task-delegation-records-v1-store.js";
import type { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type {
  PreparedExecutionTreeMutation,
  PreparedTaskMutationCommit,
  PreparedTaskSettlementCommit,
  PreparedTeamMessageAppend,
  TaskMutationCommitResult,
  TaskSettlementCommitResult,
  TeamMessageCommitResult,
  TeamRunFileRole,
} from "./team-run-persistence-contract.js";
import { TeamRunPersistenceFailStoppedError } from "./team-run-persistence-contract.js";
import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-lifecycle-command.js";

export type TeamRunPersistenceFailStop = (input: {
  file: RunPackageFileWriteResult & { outcome: "renamed_finalization_indeterminate" };
} | {
  postDurabilityError: Error;
  fileRole: TeamRunFileRole;
}) => void;

/** Serializes all physical mutations for one root TeamRun. */
export class TeamRunPersistenceCoordinator {
  private tail: Promise<void> = Promise.resolve();
  private failStopped = false;

  constructor(private readonly options: {
    rootTeamRunId: string;
    teamMemoryDir: string;
    executionTreeStore: TeamRunExecutionTreeStore;
    taskRecordsStore: TaskDelegationRecordsV1Store;
    communicationStore: TeamCommunicationV1Store;
    enterPersistenceFailStop: TeamRunPersistenceFailStop;
  }) {}

  commitTaskMutation(command: PreparedTaskMutationCommit): Promise<TaskMutationCommitResult> {
    return this.withRootLock(() => this.commitTaskMutationLocked(command));
  }

  enterRootFailStop(): void {
    this.failStopped = true;
  }

  commitTaskSettlement(command: PreparedTaskSettlementCommit): Promise<TaskSettlementCommitResult> {
    return this.withRootLock(async () => {
      let prepared: ReturnType<PreparedTaskSettlementCommit["prepareAgainstCurrent"]>;
      try {
        prepared = command.prepareAgainstCurrent();
      } catch (error) {
        command.settlement.cancelBeforeDurability();
        throw error;
      }
      const result = await this.options.executionTreeStore.write(
        this.options.teamMemoryDir,
        prepared.nextTree,
      );
      if (result.outcome === "not_renamed") {
        command.settlement.cancelBeforeDurability();
        return { outcome: "not_committed", cause: result.cause };
      }
      if (result.outcome === "renamed_finalization_indeterminate") {
        this.latchPersistenceFailStop(result);
        return {
          outcome: "finalization_indeterminate",
          file: "execution_tree",
          stage: result.stage,
        };
      }
      const settlement = this.finalizeAfterDurability("execution_tree", () => command.settlement.commitAfterDurability());
      this.finalizeAfterDurability("execution_tree", () => prepared.commitTreeAndEvent(settlement));
      return { outcome: "committed", settlement };
    });
  }

  commitReservedMessageAppend(plan: PreparedTeamMessageAppend): Promise<TeamMessageCommitResult> {
    return this.withRootLock(() => this.commitReservedMessageAppendLocked(plan));
  }

  commitExecutionTreeMutation(plan: PreparedExecutionTreeMutation): Promise<TaskMutationCommitResult> {
    return this.withRootLock(async () => {
      const change = plan.prepareAgainstCurrent();
      if (!change.requiresWrite) {
        this.finalizeAfterDurability("execution_tree", () => change.commitAfterDurability());
        return { outcome: "committed" };
      }
      const result = await this.options.executionTreeStore.write(
        this.options.teamMemoryDir,
        change.nextTree,
      );
      if (result.outcome === "not_renamed") {
        change.cancelBeforeDurability();
        return {
          outcome: "not_committed",
          failedFile: result.file,
          treeOrphanMayExist: false,
          cause: result.cause,
        };
      }
      if (result.outcome === "renamed_finalization_indeterminate") {
        this.latchPersistenceFailStop(result);
        return { outcome: "finalization_indeterminate", file: result.file, stage: result.stage };
      }
      this.finalizeAfterDurability("execution_tree", () => change.commitAfterDurability());
      return { outcome: "committed" };
    });
  }

  readConsistent<T>(reader: () => T): Promise<T> {
    return this.withRootLock(async () => reader());
  }

  drain(): Promise<void> {
    return this.tail;
  }

  private async commitTaskMutationLocked(
    command: PreparedTaskMutationCommit,
  ): Promise<TaskMutationCommitResult> {
    let activationPlan: ReturnType<Extract<PreparedTaskMutationCommit, { kind: "activation" }>["prepareAgainstCurrent"]> | null = null;
    if (command.kind === "activation") {
      command.activation.assertCommitReady();
      try {
        activationPlan = command.prepareAgainstCurrent();
      } catch (error) {
        await command.activation.abortBeforeCommit();
        throw error;
      }
    }
    if (command.kind === "activation") {
      const treeResult = await this.options.executionTreeStore.write(
        this.options.teamMemoryDir,
        activationPlan!.nextTree,
      );
      const treeFailure = await this.handleTaskFileFailure(command, treeResult, false);
      if (treeFailure) return treeFailure;
    }
    const taskResult = await this.options.taskRecordsStore.write(
      this.options.teamMemoryDir,
      command.kind === "activation" ? activationPlan!.nextTasks : command.nextTasks,
    );
    const taskFailure = await this.handleTaskFileFailure(
      command,
      taskResult,
      command.kind === "activation",
    );
    if (taskFailure) return taskFailure;

    if (command.kind === "activation") {
      this.finalizeAfterDurability("task_records", () => command.activation.commitAfterDurability());
    } else {
      this.finalizeAfterDurability("task_records", () => command.commitAfterDurability());
    }
    return { outcome: "committed" };
  }

  private async handleTaskFileFailure(
    command: PreparedTaskMutationCommit,
    result: RunPackageFileWriteResult<TeamRunFileRole>,
    treeOrphanMayExist: boolean,
  ): Promise<TaskMutationCommitResult | null> {
    if (result.outcome === "committed") return null;
    if (result.outcome === "renamed_finalization_indeterminate") {
      this.latchPersistenceFailStop(result);
      if (command.kind === "activation") await command.activation.abortBeforeCommit();
      return { outcome: "finalization_indeterminate", file: result.file, stage: result.stage };
    }
    if (command.kind === "activation") await command.activation.abortBeforeCommit();
    else command.cancelBeforeDurability();
    return {
      outcome: "not_committed",
      failedFile: result.file,
      treeOrphanMayExist,
      cause: result.cause,
    };
  }

  private async commitReservedMessageAppendLocked(
    plan: PreparedTeamMessageAppend,
  ): Promise<TeamMessageCommitResult> {
    if (plan.rootTeamRunId !== this.options.rootTeamRunId) {
      plan.cancelBeforePreparation();
      return {
        outcome: "conflict",
        code: "TEAM_MESSAGE_COMMIT_CONFLICT",
        message: `Message append belongs to root '${plan.rootTeamRunId}', not '${this.options.rootTeamRunId}'.`,
      };
    }
    const prepared = plan.prepareAgainstCurrent();
    if (!prepared.prepared) {
      return { outcome: "conflict", code: prepared.code, message: prepared.message };
    }
    const result = await this.options.communicationStore.write(
      this.options.teamMemoryDir,
      prepared.commit.nextMessages,
    );
    if (result.outcome === "not_renamed") {
      prepared.commit.cancelBeforeDurability("TEAM_MESSAGE_HISTORY_COMMIT_FAILED");
      return { outcome: "not_committed", cause: result.cause };
    }
    if (result.outcome === "renamed_finalization_indeterminate") {
      this.latchPersistenceFailStop(result);
      return { outcome: "finalization_indeterminate", stage: result.stage };
    }
    this.finalizeAfterDurability("communication_messages", () => prepared.commit.commitAfterDurability());
    return { outcome: "committed" };
  }

  private withRootLock<T>(operation: () => Promise<T>): Promise<T> {
    const guarded = () => this.failStopped
      ? Promise.reject<T>(new TeamRunPersistenceFailStoppedError(this.options.rootTeamRunId))
      : operation();
    const scheduled = this.tail.then(guarded, guarded);
    this.tail = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private latchPersistenceFailStop(
    result: RunPackageFileWriteResult & { outcome: "renamed_finalization_indeterminate" },
  ): void {
    this.failStopped = true;
    this.options.enterPersistenceFailStop({ file: result });
  }

  private finalizeAfterDurability<T>(fileRole: TeamRunFileRole, action: () => T): T {
    try {
      return action();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.failStopped = true;
      this.options.enterPersistenceFailStop({ postDurabilityError: error, fileRole });
      throw new RootTaskPersistenceFinalizationIndeterminateError(
        "agent_team",
        fileRole,
        "post_durability_publication",
        `TeamRun '${fileRole}' is durable but local publication failed: ${error.message}`,
      );
    }
  }
}
