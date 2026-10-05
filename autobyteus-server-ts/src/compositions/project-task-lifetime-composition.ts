import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { TaskLifetimeGate, type TaskLifetimeRuntime } from "../agent-collaboration/execution/task/task-lifetime-gate.js";
import {
  initializeProjectTaskServiceProcessInstance,
  releaseProjectTaskServiceProcessInstance,
} from "../projects/services/project-task-service.js";

/**
 * The one place Projects and collaboration runtime are bound. It creates the process gate,
 * initializes the Task service process instance with the gate as closure listener and an
 * exact-root release request, and returns the neutral binding that roots receive.
 */
export const composeProjectTaskLifetimes = (deps: Readonly<{
  activeRootDirectory: ActiveCollaborationRootDirectory;
}>): TaskLifetimeRuntime => {
  let gate: TaskLifetimeGate | null = null;
  const service = initializeProjectTaskServiceProcessInstance({
    closureListener: { onLifetimesClosed: (lifetimeIds) => gate?.onLifetimesClosed(lifetimeIds) },
    requestRuntimeRelease: (root, lifetimeId, executions) =>
      deps.activeRootDirectory.resolve(root)?.releaseTaskLifetime?.(lifetimeId, executions) ?? null,
  });
  gate = new TaskLifetimeGate(service);
  return Object.freeze({ port: service, gate });
};

/** Host close and startup rollback release the process binding composed above. */
export const releaseProjectTaskLifetimes = (runtime: TaskLifetimeRuntime): void => {
  releaseProjectTaskServiceProcessInstance(runtime.port);
};
