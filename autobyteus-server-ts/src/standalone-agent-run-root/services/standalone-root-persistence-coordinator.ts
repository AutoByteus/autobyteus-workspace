import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type {
  StandaloneRootMessagesFileV1,
  StandaloneRootTreeSnapshot,
} from "../domain/standalone-root-tree.js";

export class StandaloneRootPersistenceFailStoppedError extends Error {
  constructor(readonly hostRunId: string) {
    super(`Agent root '${hostRunId}' persistence is fail-stopped pending strict reopen.`);
    this.name = "StandaloneRootPersistenceFailStoppedError";
  }
}

/**
 * Serializes the Agent-root package writes. The package is created lazily: the first tree
 * commit (the first collaborator, or the first catalog copy started by `delegate_task`) writes
 * the messages file, then the tree, and then records the catalog flag. A run that never brings
 * anyone in never gets a package; listing writes nothing.
 */
export class StandaloneRootPersistenceCoordinator {
  private tail: Promise<void> = Promise.resolve();
  private failStopped = false;
  private created: boolean;

  constructor(private readonly options: Readonly<{
    hostRunId: string;
    collaborationDir: string;
    store: StandaloneRootPackageStore;
    packageExists: boolean;
    getMessages(): StandaloneRootMessagesFileV1;
    onPackageCreated(): Promise<void>;
    enterPersistenceFailStop(error: Error): void;
  }>) {
    this.created = options.packageExists;
  }

  commitTreeMutation(input: Readonly<{
    prepareAgainstCurrent(): Readonly<{
      nextTree: StandaloneRootTreeSnapshot;
      commitAfterDurability(): void;
      cancelBeforeDurability(): void;
    }>;
  }>): Promise<void> {
    return this.withLock(async () => {
      const prepared = input.prepareAgainstCurrent();
      const createsPackage = !this.created;
      if (createsPackage) {
        const messages = await this.options.store.writeMessages(this.options.collaborationDir, this.options.getMessages());
        if (messages.outcome === "not_renamed") {
          prepared.cancelBeforeDurability();
          throw messages.cause;
        }
        if (messages.outcome === "renamed_finalization_indeterminate") this.latchAndThrow(messages);
      }
      const result = await this.options.store.writeTree(this.options.collaborationDir, prepared.nextTree);
      if (result.outcome === "not_renamed") {
        prepared.cancelBeforeDurability();
        throw result.cause;
      }
      if (result.outcome === "renamed_finalization_indeterminate") this.latchAndThrow(result);
      this.created = true;
      this.finalize("execution_tree", prepared.commitAfterDurability);
      if (createsPackage) await this.recordPackageCreated();
    });
  }

  /** Task activation is one tree write (execution + delegator + staged bindings). */
  commitTaskActivation(input: Readonly<{
    prepareAgainstCurrent(): Readonly<{ nextTree: StandaloneRootTreeSnapshot }>;
    commitAfterDurability(): void;
    abortBeforeDurability(): Promise<void>;
  }>): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>> {
    return this.withLock(async () => {
      let prepared: ReturnType<typeof input.prepareAgainstCurrent>;
      try {
        prepared = input.prepareAgainstCurrent();
      } catch (error) {
        await input.abortBeforeDurability();
        throw error;
      }
      // A catalog copy can be the run's first write (REQ-008): it creates the package.
      const createsPackage = !this.created;
      for (const write of createsPackage ? ["messages", "tree"] as const : ["tree"] as const) {
        const result = write === "messages"
          ? await this.options.store.writeMessages(this.options.collaborationDir, this.options.getMessages())
          : await this.options.store.writeTree(this.options.collaborationDir, prepared.nextTree);
        if (result.outcome === "not_renamed") {
          await input.abortBeforeDurability();
          return { committed: false, message: result.cause.message };
        }
        if (result.outcome === "renamed_finalization_indeterminate") {
          await input.abortBeforeDurability();
          this.latchAndThrow(result);
        }
      }
      this.created = true;
      this.finalize("execution_tree", input.commitAfterDurability);
      if (createsPackage) await this.recordPackageCreated();
      return { committed: true };
    });
  }

  commitCommunication(input: Readonly<{
    nextMessages: StandaloneRootMessagesFileV1;
    commitAfterDurability(): void;
    cancelBeforeDurability(): void;
  }>): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; code: string; message: string }>> {
    return this.withLock(async () => {
      const result = await this.options.store.writeMessages(this.options.collaborationDir, input.nextMessages);
      if (result.outcome === "not_renamed") {
        input.cancelBeforeDurability();
        return { committed: false, code: "AGENT_ROOT_MESSAGE_HISTORY_COMMIT_FAILED", message: result.cause.message };
      }
      if (result.outcome === "renamed_finalization_indeterminate") this.latchAndThrow(result);
      this.finalize("communication_messages", input.commitAfterDurability);
      return { committed: true };
    });
  }

  readConsistent<T>(reader: () => T): Promise<T> { return this.withLock(async () => reader()); }

  private async recordPackageCreated(): Promise<void> {
    await this.options.onPackageCreated().catch((error: unknown) => {
      console.error(`Agent root '${this.options.hostRunId}' catalog flag was not recorded:`, error);
    });
  }
  drain(): Promise<void> { return this.tail; }
  enterRootFailStop(): void { this.failStopped = true; }

  private withLock<T>(operation: () => Promise<T>): Promise<T> {
    const guarded = () => this.failStopped
      ? Promise.reject<T>(new StandaloneRootPersistenceFailStoppedError(this.options.hostRunId))
      : operation();
    const scheduled = this.tail.then(guarded, guarded);
    this.tail = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private latchAndThrow(result: Extract<RunPackageFileWriteResult, { outcome: "renamed_finalization_indeterminate" }>): never {
    const error = new RootTaskPersistenceFinalizationIndeterminateError("agent", result.file, result.stage);
    this.failStopped = true;
    this.options.enterPersistenceFailStop(error);
    throw error;
  }

  private finalize(fileRole: string, action: () => void): void {
    try {
      action();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.failStopped = true;
      this.options.enterPersistenceFailStop(error);
      throw new RootTaskPersistenceFinalizationIndeterminateError(
        "agent", fileRole, "post_durability_publication",
        `Agent root '${fileRole}' is durable but local publication failed: ${error.message}`,
      );
    }
  }
}
