import type { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type {
  ExecutionTreeCommitResult,
  PreparedExecutionTreeMutation,
  PreparedTaskActivationMutation,
  PreparedTeamMessageAppend,
  TeamMessageCommitResult,
  TeamRunFileRole,
} from "./team-run-persistence-contract.js";
import { TeamRunPersistenceFailStoppedError } from "./team-run-persistence-contract.js";
import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";

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
    communicationStore: TeamCommunicationV1Store;
    enterPersistenceFailStop: TeamRunPersistenceFailStop;
  }) {}

  commitTaskActivation(command: PreparedTaskActivationMutation): Promise<ExecutionTreeCommitResult> {
    return this.withRootLock(() => this.commitTaskActivationLocked(command));
  }

  enterRootFailStop(): void {
    this.failStopped = true;
  }

  commitReservedMessageAppend(plan: PreparedTeamMessageAppend): Promise<TeamMessageCommitResult> {
    return this.withRootLock(() => this.commitReservedMessageAppendLocked(plan));
  }

  commitExecutionTreeMutation(plan: PreparedExecutionTreeMutation): Promise<ExecutionTreeCommitResult> {
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
        return { outcome: "not_committed", cause: result.cause };
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

  private async commitTaskActivationLocked(
    command: PreparedTaskActivationMutation,
  ): Promise<ExecutionTreeCommitResult> {
    command.activation.assertCommitReady();
    let plan: ReturnType<PreparedTaskActivationMutation["prepareAgainstCurrent"]>;
    try {
      plan = command.prepareAgainstCurrent();
    } catch (error) {
      await command.activation.abortBeforeCommit();
      throw error;
    }
    const result = await this.options.executionTreeStore.write(this.options.teamMemoryDir, plan.nextTree);
    if (result.outcome === "renamed_finalization_indeterminate") {
      this.latchPersistenceFailStop(result);
      await command.activation.abortBeforeCommit();
      return { outcome: "finalization_indeterminate", file: result.file, stage: result.stage };
    }
    if (result.outcome === "not_renamed") {
      await command.activation.abortBeforeCommit();
      return { outcome: "not_committed", cause: result.cause };
    }
    this.finalizeAfterDurability("execution_tree", () => command.activation.commitAfterDurability());
    return { outcome: "committed" };
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
