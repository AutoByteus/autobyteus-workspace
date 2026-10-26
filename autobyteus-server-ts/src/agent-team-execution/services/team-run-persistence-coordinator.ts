import type { RootMessageAppend, RootMessageAppendResult } from "../../agent-collaboration/execution/communication/root-message-append.js";
import type { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { TeamCommunicationStore } from "../../services/team-communication/team-communication-store.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type {
  ExecutionTreeCommitResult,
  PreparedExecutionTreeMutation,
  PreparedTaskActivationMutation,
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
    communicationStore: TeamCommunicationStore;
    enterPersistenceFailStop: TeamRunPersistenceFailStop;
  }) {}

  commitTaskActivation(command: PreparedTaskActivationMutation): Promise<ExecutionTreeCommitResult> {
    return this.withRootLock(() => this.commitTaskActivationLocked(command));
  }

  enterRootFailStop(): void {
    this.failStopped = true;
  }

  /** One message: prepared, then appended to its logs under the root lock; an indeterminate write is thrown. */
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult> {
    return this.withRootLock(() => this.commitMessageAppendLocked(append));
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

  private async commitMessageAppendLocked(append: RootMessageAppend): Promise<RootMessageAppendResult> {
    const prepared = append.prepare();
    if (prepared.kind !== "append") return { outcome: prepared.kind };
    const result = await this.options.communicationStore.appendMessage(
      this.options.teamMemoryDir,
      this.options.rootTeamRunId,
      append.message,
      prepared.logOwners,
    );
    if (result.outcome === "not_renamed") {
      append.cancelBeforeDurability();
      return { outcome: "not_committed", cause: result.cause };
    }
    if (result.outcome === "renamed_finalization_indeterminate") {
      this.latchPersistenceFailStop(result);
      // The Team message path's own error and text (A7).
      throw new Error(`Team message finalization is indeterminate at '${result.stage}'.`);
    }
    this.finalizeAfterDurability("communication_messages", () => append.commitAfterDurability());
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
