import type { RootMessageAppend, RootMessageAppendResult } from "../../agent-collaboration/execution/communication/root-message-append.js";
import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type { StandaloneRootMessagesFile } from "../domain/standalone-run-agent.js";

export class StandaloneRootPersistenceFailStoppedError extends Error {
  constructor(readonly agentRunId: string) {
    super(`Agent root '${agentRunId}' persistence is fail-stopped pending strict reopen.`);
    this.name = "StandaloneRootPersistenceFailStoppedError";
  }
}

/**
 * Serializes a standalone run's writes of its own message log (contract §3.4): the log is created by the run's first
 * message, then each message is appended. A refused or conflicting message writes nothing. An indeterminate write
 * fail-stops the root.
 */
export class StandaloneRootPersistenceCoordinator {
  private tail: Promise<void> = Promise.resolve();
  private failStopped = false;
  private created: boolean | null = null;

  constructor(private readonly options: Readonly<{
    agentRunId: string;
    runDir: string;
    store: StandaloneRootPackageStore;
    getMessages(): StandaloneRootMessagesFile;
    enterPersistenceFailStop(error: Error): void;
  }>) {}

  /** One message: prepared, then appended to the run's log under the lock (the log first created when absent). */
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult> {
    return this.withLock(async () => {
      const prepared = append.prepare();
      if (prepared.kind !== "append") return { outcome: prepared.kind };
      // Only the run's own log is written here: another run's log is written by its own root (CM-9).
      if (!prepared.logOwners.some((owner) => owner.kind === "own")) {
        this.finalize(() => append.commitAfterDurability());
        return { outcome: "committed" };
      }
      this.created ??= await this.options.store.logExists(this.options.runDir);
      if (!this.created) {
        const created = await this.options.store.writeMessages(this.options.runDir, this.options.getMessages());
        if (created.outcome === "not_committed") {
          append.cancelBeforeDurability();
          return { outcome: "not_committed", cause: created.cause };
        }
        if (created.outcome === "finalization_indeterminate") this.latchAndThrow(created);
        this.created = true;
      }
      const result = await this.options.store.appendMessage(this.options.runDir, append.message);
      if (result.outcome === "not_committed") {
        append.cancelBeforeDurability();
        return { outcome: "not_committed", cause: result.cause };
      }
      if (result.outcome === "finalization_indeterminate") this.latchAndThrow(result);
      this.finalize(() => append.commitAfterDurability());
      return { outcome: "committed" };
    });
  }

  drain(): Promise<void> { return this.tail; }
  enterRootFailStop(): void { this.failStopped = true; }

  private withLock<T>(operation: () => Promise<T>): Promise<T> {
    const guarded = () => this.failStopped
      ? Promise.reject<T>(new StandaloneRootPersistenceFailStoppedError(this.options.agentRunId))
      : operation();
    const scheduled = this.tail.then(guarded, guarded);
    this.tail = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private latchAndThrow(result: Extract<RunPackageFileWriteResult, { outcome: "finalization_indeterminate" }>): never {
    const error = new RootTaskPersistenceFinalizationIndeterminateError("agent", result.file, result.stage);
    this.failStopped = true;
    this.options.enterPersistenceFailStop(error);
    throw error;
  }

  private finalize(action: () => void): void {
    try {
      action();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.failStopped = true;
      this.options.enterPersistenceFailStop(error);
      throw new RootTaskPersistenceFinalizationIndeterminateError(
        "agent", "communication_messages", "post_durability_publication",
        `Agent root 'communication_messages' is durable but local publication failed: ${error.message}`,
      );
    }
  }
}
