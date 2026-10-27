import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type {
  RunPackageDirectoryFinalizationStage,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";

export type TeamRunFileRole = "execution_tree" | "communication_messages";
type TeamRunDirectoryFinalizationStage = RunPackageDirectoryFinalizationStage;

export class TeamRunPersistenceFinalizationIndeterminateError extends RootTaskPersistenceFinalizationIndeterminateError {
  constructor(
    readonly file: TeamRunFileRole,
    readonly stage: TeamRunDirectoryFinalizationStage,
  ) {
    super("agent_team", file, stage, `TeamRun '${file}' finalization is indeterminate at '${stage}'.`);
    this.name = "TeamRunPersistenceFinalizationIndeterminateError";
  }
}

export class TeamRunPersistenceFailStoppedError extends Error {
  constructor(readonly rootTeamRunId: string) {
    super(`Root TeamRun '${rootTeamRunId}' persistence is fail-stopped pending strict reopen.`);
    this.name = "TeamRunPersistenceFailStoppedError";
  }
}

export type PreparedTaskActivationCommit = Readonly<{
  assertCommitReady(): void;
  abortBeforeCommit(): Promise<void>;
  commitAfterDurability(): void;
}>;

/** Task-execution activation is one execution-tree write (execution + delegator). */
export type PreparedTaskActivationMutation = Readonly<{
  activation: PreparedTaskActivationCommit;
  prepareAgainstCurrent(): Readonly<{ nextTree: TeamRunExecutionTreeSnapshot }>;
}>;

export type ExecutionTreeCommitResult =
  | Readonly<{ outcome: "not_committed"; cause: Error }>
  | Readonly<{ outcome: "committed" }>
  | Readonly<{
      outcome: "finalization_indeterminate";
      file: TeamRunFileRole;
      stage: TeamRunDirectoryFinalizationStage;
    }>;

export type PreparedExecutionTreeCommit = Readonly<{
  nextTree: TeamRunExecutionTreeSnapshot;
  requiresWrite: boolean;
  cancelBeforeDurability(): void;
  commitAfterDurability(): void;
}>;

export type PreparedExecutionTreeMutation = Readonly<{
  prepareAgainstCurrent(): PreparedExecutionTreeCommit;
}>;
