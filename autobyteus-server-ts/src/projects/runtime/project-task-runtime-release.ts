import { rootExecutionIdentityKey, type RootExecutionIdentity } from '../../agent-collaboration/execution/domain/root-execution-identity.js';
import type { TaskExecutionReleaseOutcome, TaskLifetimeReleaseReport } from '../../agent-collaboration/execution/task/task-execution-lifetime.js';
import type { TaskExecutionReference } from '../../agent-collaboration/execution/task/task-execution-reference.js';
import type { ProjectTaskLifetime } from '../domain/project-task-execution.js';
/** Injected exact-root release; `null` means no registered root release authority. */
export type TaskRootReleaseRequest = (root: RootExecutionIdentity, lifetimeId: string,
  executions: readonly TaskExecutionReference[]) => Promise<TaskLifetimeReleaseReport> | null;
const requestedOnly = (executions: readonly TaskExecutionReference[], outcome: Omit<TaskExecutionReleaseOutcome, 'execution'>): TaskLifetimeReleaseReport =>
  ({ requested: executions.map(execution => ({ execution, ...outcome })), unrequested: [] });
/** Task-owned effect; policy/store updates stay with the injected Task authority callback. */
export class ProjectTaskRuntimeRelease {
  private readonly attempts = new Map<string, Promise<void>>();
  constructor(private readonly options: {
    request?: TaskRootReleaseRequest;
    record(lifetimeId: string, root: RootExecutionIdentity, report: TaskLifetimeReleaseReport): Promise<void>;
  }) {}
  initiate(lifetime: ProjectTaskLifetime): void {
    const outstanding = lifetime.executions.filter(e => e.cleanup !== 'released');
    const roots = new Map(outstanding.map(e => [rootExecutionIdentityKey(e.root), e.root]));
    for (const [key, root] of roots) {
      const attemptKey = `${lifetime.lifetimeId}\0${key}`;
      if (this.attempts.has(attemptKey)) continue;
      const executions = outstanding.filter(e => rootExecutionIdentityKey(e.root) === key).map(e => e.execution);
      const attempt = this.run(lifetime.lifetimeId, root, executions);
      this.attempts.set(attemptKey, attempt);
      void attempt.finally(() => { if (this.attempts.get(attemptKey) === attempt) this.attempts.delete(attemptKey); }).catch(error => {
        console.error('Task cleanup result could not be persisted; completion remains closed.', error);
      });
    }
  }
  private async run(id: string, root: RootExecutionIdentity, executions: readonly TaskExecutionReference[]): Promise<void> {
    let report: TaskLifetimeReleaseReport;
    try {
      const pending = this.options.request?.(root, id, executions) ?? null;
      report = pending ? await pending : requestedOnly(executions, { cleanup: 'pending', error: {
        code: 'TASK_ROOT_RELEASE_UNAVAILABLE', message: 'No exact registered root release authority/no-owned-runtime proof is available; no restore attempted.' } });
    } catch (error) {
      report = requestedOnly(executions, { cleanup: 'failed', error: {
        code: 'TASK_RUNTIME_RELEASE_FAILED', message: error instanceof Error ? error.message : String(error) } });
    }
    await this.options.record(id, root, report);
  }
  async drain(): Promise<void> { await Promise.all([...this.attempts.values()]); }
}
