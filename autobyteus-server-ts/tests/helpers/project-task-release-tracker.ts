import type { TaskExecutionReleaseRequest } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

/** Every root stops every run it is asked to stop. */
export const stopEveryRun: TaskExecutionReleaseRequest = async (_hostRoot, executions) => executions.map((execution) => ({ execution, stopped: true }));

export type ReleaseTracker = Readonly<{ request: TaskExecutionReleaseRequest; settled(): Promise<void> }>;

/**
 * A `requestRelease` for `ProjectTaskService` that remembers each stop request it passes to `inner`. DONE or CANCELLED
 * asks for the stops without waiting for them; `settled()` waits for every request made so far and then one macrotask,
 * so the service has also logged each stop result.
 */
export const trackReleases = (inner: TaskExecutionReleaseRequest = stopEveryRun): ReleaseTracker => {
  const pending: Promise<unknown>[] = [];
  const request: TaskExecutionReleaseRequest = (hostRoot, executions) => {
    const answer = inner(hostRoot, executions);
    if (answer) pending.push(answer.catch(() => undefined));
    return answer;
  };
  const settled = async (): Promise<void> => {
    while (pending.length) await Promise.all(pending.splice(0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { request, settled };
};
