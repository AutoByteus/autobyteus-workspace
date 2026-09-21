import { RootTaskPersistenceFinalizationIndeterminateError } from "../../agent-collaboration/execution/task/task-lifecycle-command.js";
import type { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import type { RunPackageFileWriteResult } from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import type { AgentOrgCommunicationMessagesV1Store } from "../persistence/agent-org-communication-messages-v1-store.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgTaskDelegationRecordsV1Store } from "../persistence/agent-org-task-delegation-records-v1-store.js";

export class AgentOrgPersistenceFailStoppedError extends Error {
  constructor(readonly orgRunId: string) {
    super(`AgentOrg '${orgRunId}' persistence is fail-stopped pending strict reopen.`);
    this.name = "AgentOrgPersistenceFailStoppedError";
  }
}

/** Serializes the exact Org tree/task/message authorities for one AgentOrg root. */
export class AgentOrgRunPersistenceCoordinator {
  private tail: Promise<void> = Promise.resolve();
  private failStopped = false;

  constructor(private readonly options: Readonly<{
    orgRunId: string;
    orgMemoryDir: string;
    executionTreeStore: AgentOrgRunExecutionTreeStore;
    taskRecordsStore: AgentOrgTaskDelegationRecordsV1Store;
    communicationStore: AgentOrgCommunicationMessagesV1Store;
    enterPersistenceFailStop(error: Error): void;
  }>) {}

  commitInitial(input: Readonly<{
    tree: AgentOrgRunExecutionTreeSnapshot;
    tasks: AgentOrgTaskDelegationRecordsFileV1;
    messages: AgentOrgCommunicationMessagesFileV1;
  }>): Promise<void> {
    return this.withLock(async () => {
      // The tree is the package's primary current-family authority. Publish it
      // last so a pre-rename sidecar failure cannot expose a tree with a missing
      // correlated authority.
      await this.requireCommitted(await this.options.taskRecordsStore.write(this.options.orgMemoryDir, input.tasks));
      await this.requireCommitted(await this.options.communicationStore.write(this.options.orgMemoryDir, input.messages));
      await this.requireCommitted(await this.options.executionTreeStore.write(this.options.orgMemoryDir, input.tree));
    });
  }

  commitTreeMutation(input: Readonly<{
    prepareAgainstCurrent(): Readonly<{
      nextTree: AgentOrgRunExecutionTreeSnapshot;
      commitAfterDurability(): void;
      cancelBeforeDurability(): void;
    }>;
  }>): Promise<void> {
    return this.withLock(async () => {
      const prepared = input.prepareAgainstCurrent();
      const result = await this.options.executionTreeStore.write(this.options.orgMemoryDir, prepared.nextTree);
      if (result.outcome === "not_renamed") {
        prepared.cancelBeforeDurability();
        throw result.cause;
      }
      if (result.outcome === "renamed_finalization_indeterminate") {
        this.latch(result);
        throw this.indeterminate(result);
      }
      this.finalizeAfterDurability("execution_tree", prepared.commitAfterDurability);
    });
  }

  commitTaskActivation(input: Readonly<{
    prepareAgainstCurrent(): Readonly<{
      nextTree: AgentOrgRunExecutionTreeSnapshot;
      nextTasks: AgentOrgTaskDelegationRecordsFileV1;
    }>;
    commitAfterDurability(): void;
    abortBeforeDurability(): Promise<void>;
  }>): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>> {
    return this.withLock(async () => {
      const prepared = input.prepareAgainstCurrent();
      const tree = await this.options.executionTreeStore.write(this.options.orgMemoryDir, prepared.nextTree);
      if (tree.outcome === "not_renamed") {
        await input.abortBeforeDurability();
        return { committed: false, message: tree.cause.message };
      }
      if (tree.outcome === "renamed_finalization_indeterminate") {
        this.latch(tree);
        throw this.indeterminate(tree);
      }
      const tasks = await this.options.taskRecordsStore.write(this.options.orgMemoryDir, prepared.nextTasks);
      if (tasks.outcome === "not_renamed") {
        await input.abortBeforeDurability();
        this.failStopped = true;
        const error = new Error(`AgentOrg task sidecar write failed after execution-tree commit: ${tasks.cause.message}`);
        this.options.enterPersistenceFailStop(error);
        throw error;
      }
      if (tasks.outcome === "renamed_finalization_indeterminate") {
        this.latch(tasks);
        throw this.indeterminate(tasks);
      }
      this.finalizeAfterDurability("task_records", input.commitAfterDurability);
      return { committed: true };
    });
  }

  commitTaskRecords(input: Readonly<{
    nextTasks: AgentOrgTaskDelegationRecordsFileV1;
    commitAfterDurability(): void;
  }>): Promise<void> {
    return this.withLock(async () => {
      const result = await this.options.taskRecordsStore.write(this.options.orgMemoryDir, input.nextTasks);
      await this.requireCommitted(result);
      this.finalizeAfterDurability("task_records", input.commitAfterDurability);
    });
  }

  commitCommunication(input: Readonly<{
    nextMessages: AgentOrgCommunicationMessagesFileV1;
    commitAfterDurability(): void;
    cancelBeforeDurability(): void;
  }>): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; code: string; message: string }>> {
    return this.withLock(async () => {
      const result = await this.options.communicationStore.write(this.options.orgMemoryDir, input.nextMessages);
      if (result.outcome === "not_renamed") {
        input.cancelBeforeDurability();
        return { committed: false, code: "AGENT_ORG_MESSAGE_HISTORY_COMMIT_FAILED", message: result.cause.message };
      }
      if (result.outcome === "renamed_finalization_indeterminate") {
        this.latch(result);
        throw this.indeterminate(result);
      }
      this.finalizeAfterDurability("communication_messages", input.commitAfterDurability);
      return { committed: true };
    });
  }

  readConsistent<T>(reader: () => T): Promise<T> { return this.withLock(async () => reader()); }
  drain(): Promise<void> { return this.tail; }
  enterRootFailStop(): void { this.failStopped = true; }

  private withLock<T>(operation: () => Promise<T>): Promise<T> {
    const guarded = () => this.failStopped
      ? Promise.reject<T>(new AgentOrgPersistenceFailStoppedError(this.options.orgRunId))
      : operation();
    const scheduled = this.tail.then(guarded, guarded);
    this.tail = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private async requireCommitted(result: RunPackageFileWriteResult): Promise<void> {
    if (result.outcome === "committed") return;
    if (result.outcome === "not_renamed") throw result.cause;
    this.latch(result);
    throw this.indeterminate(result);
  }
  private latch(result: Extract<RunPackageFileWriteResult, { outcome: "renamed_finalization_indeterminate" }>): void {
    this.failStopped = true;
    this.options.enterPersistenceFailStop(this.indeterminate(result));
  }
  private indeterminate(result: Extract<RunPackageFileWriteResult, { outcome: "renamed_finalization_indeterminate" }>) {
    return new RootTaskPersistenceFinalizationIndeterminateError("agent_org", result.file, result.stage);
  }

  private finalizeAfterDurability(fileRole: string, action: () => void): void {
    try {
      action();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.failStopped = true;
      this.options.enterPersistenceFailStop(error);
      throw new RootTaskPersistenceFinalizationIndeterminateError(
        "agent_org",
        fileRole,
        "post_durability_publication",
        `AgentOrg '${fileRole}' is durable but local publication failed: ${error.message}`,
      );
    }
  }
}
