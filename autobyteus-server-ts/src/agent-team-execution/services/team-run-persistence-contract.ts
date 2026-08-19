import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TaskDelegationRecordsSnapshot } from "../task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";
import type {
  CommittedTaskSettlement,
  PreparedTaskSettlement,
} from "../domain/prepared-task-settlement.js";
import type {
  TeamRunDirectoryFinalizationStage,
  TeamRunFileRole,
} from "../../run-history/store/team-run-file-commit-writer.js";

export class TeamRunPersistenceFinalizationIndeterminateError extends Error {
  constructor(
    readonly file: TeamRunFileRole,
    readonly stage: TeamRunDirectoryFinalizationStage,
  ) {
    super(`TeamRun '${file}' finalization is indeterminate at '${stage}'.`);
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

export type PreparedTaskMutationCommit =
  | Readonly<{
      kind: "activation";
      activation: PreparedTaskActivationCommit;
      prepareAgainstCurrent(): Readonly<{
        nextTree: TeamRunExecutionTreeSnapshot;
        nextTasks: TaskDelegationRecordsSnapshot;
      }>;
    }>
  | Readonly<{
      kind: "record_transition";
      nextTasks: TaskDelegationRecordsSnapshot;
      cancelBeforeDurability(): void;
      commitAfterDurability(): void;
    }>;

export type PreparedTaskSettlementCommit = Readonly<{
  settlement: PreparedTaskSettlement;
  prepareAgainstCurrent(): Readonly<{
    nextTree: TeamRunExecutionTreeSnapshot;
    commitTreeAndEvent(settlement: CommittedTaskSettlement): void;
  }>;
}>;

export type TaskMutationCommitResult =
  | Readonly<{
      outcome: "not_committed";
      failedFile: TeamRunFileRole;
      treeOrphanMayExist: boolean;
      cause: Error;
    }>
  | Readonly<{ outcome: "committed" }>
  | Readonly<{
      outcome: "finalization_indeterminate";
      file: TeamRunFileRole;
      stage: TeamRunDirectoryFinalizationStage;
    }>;

export type TaskSettlementCommitResult =
  | Readonly<{ outcome: "not_committed"; cause: Error }>
  | Readonly<{ outcome: "committed"; settlement: CommittedTaskSettlement }>
  | Readonly<{
      outcome: "finalization_indeterminate";
      file: "execution_tree";
      stage: TeamRunDirectoryFinalizationStage;
    }>;

export type TeamMessageAppendRejectionCode =
  | "TEAM_MESSAGE_COMMIT_CONFLICT"
  | "TEAM_MESSAGE_HISTORY_COMMIT_FAILED";

export type PreparedTeamMessageCommit = Readonly<{
  nextMessages: TeamCommunicationMessagesSnapshot;
  cancelBeforeDurability(code: TeamMessageAppendRejectionCode): void;
  commitAfterDurability(): void;
}>;

export type PreparedTeamMessageAppend = Readonly<{
  rootTeamRunId: string;
  messageId: string;
  prepareAgainstCurrent():
    | Readonly<{
        prepared: false;
        code: "TEAM_MESSAGE_COMMIT_CONFLICT";
        message: string;
      }>
    | Readonly<{ prepared: true; commit: PreparedTeamMessageCommit }>;
  cancelBeforePreparation(): void;
  disposeAfterRootFailStop(): void;
}>;

export type TeamMessageCommitResult =
  | Readonly<{
      outcome: "conflict";
      code: "TEAM_MESSAGE_COMMIT_CONFLICT";
      message: string;
    }>
  | Readonly<{ outcome: "not_committed"; cause: Error }>
  | Readonly<{ outcome: "committed" }>
  | Readonly<{
      outcome: "finalization_indeterminate";
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
