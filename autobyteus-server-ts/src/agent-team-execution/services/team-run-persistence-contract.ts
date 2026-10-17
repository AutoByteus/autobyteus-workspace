import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { MessageLogOwner } from "../../run-history/store/task-agent-message-logs.js";
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

export type TeamMessageAppendRejectionCode =
  | "TEAM_MESSAGE_COMMIT_CONFLICT"
  | "TEAM_MESSAGE_HISTORY_COMMIT_FAILED";

export type PreparedTeamMessageCommit = Readonly<{
  nextMessages: TeamCommunicationMessagesSnapshot;
  /** The one message this commit adds, and the logs it belongs to (receiver's first; D-4). */
  message: CollaborationCommunicationMessage;
  logOwners: readonly MessageLogOwner[];
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
