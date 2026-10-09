import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RootTaskExecutionAdapter, TaskExecutionActivationOperation, TaskExecutionActivationPlan } from "./root-task-execution-adapter.js";
import type { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import type { TaskExecutionAssignmentTarget, TaskExecutionResourcePort } from "./task-execution-resource-port.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import { asTaskDelegationError } from "./root-task-execution-resource-scope.js";
import { RootTaskPersistenceFinalizationIndeterminateError, TaskDelegationError, TaskDispatchIndeterminateError, type TaskDelegationContext, type DelegateTaskResult } from "./task-delegation-command.js";

/**
 * How the new copy joins a Task, decided by the lifecycle from the sender's ownership: an assignment
 * to an existing Task or to a new Task with no Project (`adHocTask`), or inherited sub-work.
 */
export type TaskExecutionJoin =
  | (Readonly<{ role: "assigned"; assignedBy: string }> & TaskExecutionAssignmentTarget)
  | Readonly<{ role: "delegated" | "broughtIn"; creator: TaskExecutionReference }>;

/**
 * One staged dispatch on the root lifecycle's queue. A Task copy is linked after identity planning
 * and before registration, so DONE or CANCELLED always reaches it; every await is followed by an open check.
 * The accepted result carries `task_id` only when the join created a Task with no Project.
 */
export async function dispatchTaskCopy<T>(input: {
  adapter: RootTaskExecutionAdapter<T>; queue: RootTaskExecutionCommandQueue;
  context: TaskDelegationContext; placement: T; workPacket?: AgentInputUserMessage;
  join: TaskExecutionJoin; resources: TaskExecutionResourcePort;
  assertAdmitting(): void;
}): Promise<DelegateTaskResult> {
  let plan: TaskExecutionActivationPlan<T> | null = null;
  let operation: TaskExecutionActivationOperation | null = null;
  let linked = false, committed = false, accepted = false;
  let createdTaskId: string | null = null;
  const assertOpen = () => {
    input.assertAdmitting();
    if (linked && !input.resources.isOpen(plan!.target.execution)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task was marked DONE or CANCELLED; its new work was not started.");
    }
  };
  try {
    input.assertAdmitting();
    plan = await input.adapter.planActivation({ identity: input.context.identity, placement: input.placement,
      startedAt: new Date().toISOString(), ...(input.workPacket ? { workPacket: input.workPacket } : {}) });
    input.assertAdmitting();
    const exact = plan;
    const target = exact.target;
    // An assignment records the address it was delegated to (the root's display name).
    const join = input.join.role === "assigned" ? { ...input.join, recipientAddress: exact.recipientAddress } : input.join;
    const link = await input.resources.linkNewTaskExecution({ ...join, hostRoot: target.root, execution: target.execution,
      ...("teamRunId" in target.execution ? { teamCoordinatorAgentRunId: target.ingressAgentRunId } : {}) })
      .catch(error => { throw asTaskDelegationError(error); });
    linked = true;
    // The join variant decides, not the returned id: a link to an existing Task returns its id too.
    if (input.join.role === "assigned" && input.join.adHocTask) createdTaskId = link.taskId;
    operation = await input.queue.submit({ kind: "activate", executeAtQueueHead: async () => {
      assertOpen(); return input.adapter.beginActivation(exact);
    } });
    const prepared = await operation.prepare();
    assertOpen();
    const result = await input.queue.submit({ kind: "activate", executeAtQueueHead: async () => {
      assertOpen(); return prepared.commit();
    } });
    if (!result.committed) throw new Error(result.message);
    committed = true;
    assertOpen();
    if (input.workPacket) {
      const receipt = await prepared.acceptSeed(assertOpen);
      if (!receipt.accepted) throw new Error(receipt.message ?? "Task seed was not accepted.");
      accepted = true;
    }
    await input.resources.markStarted(exact.target.execution);
    const spawned = { target_agent_run_id: exact.target.ingressAgentRunId,
      target_kind: "agentRunId" in exact.target.execution ? "agent" as const : "team" as const };
    return createdTaskId ? { ...spawned, task_id: createdTaskId } : spawned;
  } catch (error) {
    operation?.cancel();
    let released = true;
    try { if (operation && !(await operation.release()).accepted) released = false; }
    catch { released = false; }
    if (linked && plan && !accepted) {
      try { await input.resources.markFailed(plan.target.execution, { code: "TASK_DISPATCH_FAILED", message: errorMessage(error) }); }
      catch (recordError) { throw new TaskDispatchIndeterminateError(plan.target.execution, new AggregateError([error, recordError])); }
    }
    if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) throw error;
    if (plan && (accepted || (committed && !released))) throw new TaskDispatchIndeterminateError(plan.target.execution, error);
    return { target_agent_run_id: null, message: errorMessage(error) };
  }
}
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
