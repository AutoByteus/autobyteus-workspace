import type { RootTaskExecutionAdapter, TaskExecutionActivationOperation, TaskExecutionActivationPlan, TaskExecutionActivationWork } from "./root-task-execution-adapter.js";
import type { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import type { TaskExecutionLifetimePort, TaskLifetimeAdmission } from "./task-execution-lifetime.js";
import { RootTaskPersistenceFinalizationIndeterminateError, TaskDispatchIndeterminateError, type TaskDelegationContext, type DelegateTaskResult } from "./task-delegation-command.js";

/** One staged dispatch, attached to the root lifecycle's queue and business admission. */
export async function dispatchTaskCopy<T>(input: {
  adapter: RootTaskExecutionAdapter<T>; queue: RootTaskExecutionCommandQueue;
  context: TaskDelegationContext; placement: T; admission?: TaskLifetimeAdmission;
  lifetimePort?: TaskExecutionLifetimePort; explicitTaskId?: string;
  assertAdmitting(): void;
} & TaskExecutionActivationWork): Promise<DelegateTaskResult> {
  let plan: TaskExecutionActivationPlan<T> | null = null;
  let operation: TaskExecutionActivationOperation | null = null;
  let reserved = false, committed = false, accepted = false;
  const assertOpen = () => { input.assertAdmitting(); input.admission?.assertOpen(); };
  try {
    assertOpen();
    const identityPlan = { identity: input.context.identity, placement: input.placement, startedAt: new Date().toISOString() };
    plan = await input.adapter.planActivation(input.workPacket
      ? { ...identityPlan, workPacket: input.workPacket, taskLifetime: input.taskLifetime }
      : { ...identityPlan, taskLifetime: input.taskLifetime });
    assertOpen();
    const exact = plan;
    operation = await input.queue.submit({ kind: "activate", executeAtQueueHead: async () => {
      assertOpen(); return input.adapter.beginActivation(exact);
    } });
    if (input.taskLifetime) {
      await input.lifetimePort!.reserveExecution(input.taskLifetime.lifetimeId, plan.link, input.explicitTaskId);
      reserved = true;
    }
    assertOpen();
    const prepared = await operation.prepare();
    assertOpen();
    const result = await input.queue.submit({ kind: "activate", executeAtQueueHead: async () => {
      assertOpen(); return prepared.commit();
    } });
    if (!result.committed) throw new Error(result.message);
    committed = true;
    if (input.taskLifetime) {
      const actual = input.adapter.linkForExecution(plan.link.execution);
      if (!actual || actual.ingressAgentRunId !== plan.link.ingressAgentRunId || actual.purpose !== plan.link.purpose)
        throw new Error("Durable Task stamp/link differs from the reserved exact identity.");
      await input.lifetimePort!.recordDispatch(input.taskLifetime.lifetimeId, plan.link, "admitted");
    }
    assertOpen();
    if (input.workPacket) {
      const receipt = await prepared.acceptSeed(assertOpen);
      if (!receipt.accepted) throw new Error(receipt.message ?? "Task seed was not accepted.");
      accepted = true;
      if (input.taskLifetime) await input.lifetimePort!.recordDispatch(input.taskLifetime.lifetimeId, plan.link, "delivered");
    }
    return { target_agent_run_id: plan.link.ingressAgentRunId };
  } catch (error) {
    operation?.cancel();
    let cleanup: "released" | "pending" | "failed" = "released";
    try { if (operation && !(await operation.release()).accepted) cleanup = "pending"; }
    catch { cleanup = "failed"; }
    if (reserved && plan && input.taskLifetime) {
      try {
        if (!accepted) await input.lifetimePort!.recordDispatch(input.taskLifetime.lifetimeId, plan.link, "failed", { code: "TASK_DISPATCH_FAILED", message: errorMessage(error) });
        await input.lifetimePort!.recordCleanup(input.taskLifetime.lifetimeId, plan.link.root, [{ execution: plan.link.execution,
          cleanup, ...(cleanup === "released" ? {} : { error: { code: "TASK_RELEASE_UNCONFIRMED", message: "Exact cleanup remains pending or failed; retry DONE." } }) }]);
      } catch (recordError) { throw new TaskDispatchIndeterminateError(plan.link.execution, new AggregateError([error, recordError])); }
    }
    if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) throw error;
    if (plan && (accepted || (committed && cleanup !== "released"))) throw new TaskDispatchIndeterminateError(plan.link.execution, error);
    return { target_agent_run_id: null, message: errorMessage(error) };
  } finally { input.admission?.release(); }
}
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
