import { vi } from "vitest";
import { RootTaskExecutionLifecycle, type DeliverTaskWork } from "../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { RootTaskExecutionAdapter } from "../../src/agent-collaboration/execution/task/root-task-execution-adapter.js";
import { TaskDelegationError } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { createRootExecutionIdentity, type CollaborationMemberExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOperationResult } from "../../src/agent-execution/domain/agent-operation-result.js";
import { InMemoryTaskExecutionResources } from "./task-execution-resource-fixtures.js";

export const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
export const root = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
export const worker: TaskExecutionReference = { agentRunId: "worker" };
export const team: TaskExecutionReference = { teamRunId: "review-team" };
export const helper: TaskExecutionReference = { agentRunId: "helper" };
/** Agent run → its innermost task execution, and that execution's ingress (an Agent itself, a Team's coordinator). */
const chains: Record<string, TaskExecutionReference[]> = { worker: [worker], lead: [team], member: [team], helper: [helper] };
const ingress: Record<string, string> = { "agent:worker": "worker", "team:review-team": "lead", "agent:helper": "helper" };

/**
 * One root over a neutral adapter double whose backend keeps a released copy's authority (fenced)
 * after DONE, as the real registries do: restoring it fails until that authority is discarded.
 */
export function fixture() {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("task-A");
  const authority = new Map<string, "live" | "fenced">();
  const log: string[] = [];
  const control = { restorable: true, releasePending: false, releaseGate: null as Promise<void> | null, restoreFailure: null as Error | null,
    deliveryRefusal: null as AgentOperationResult | null };
  const key = taskExecutionReferenceKey;
  const adapter: RootTaskExecutionAdapter<string> = {
    root, isOpen: () => true, authorize: () => undefined, assertCurrentSchemaReady: () => undefined,
    planActivation: vi.fn(), beginActivation: vi.fn(), registrationFor: () => null, taskExecutionAt: () => null,
    ownershipChainFor: agentRunId => chains[agentRunId] ?? [],
    taskExecutionChainFor: agentRunId => chains[agentRunId] ?? [],
    listTaskExecutions: () => [worker, team, helper],
    taskExecutionStatus: reference => authority.get(key(reference)) === "live" ? "idle" : "offline",
    cancelOwnedExecution: vi.fn(),
    releaseOwnedExecution: vi.fn(async (reference: TaskExecutionReference): Promise<AgentOperationResult> => {
      log.push(`release:${key(reference)}:${authority.get(key(reference)) ?? "none"}`);
      if (control.releaseGate) await control.releaseGate;
      if (control.releasePending) return { accepted: false, code: "RUNTIME_RELEASE_PENDING", message: "still stopping" };
      if (!authority.has(key(reference))) return { accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" };
      authority.set(key(reference), "fenced");
      return { accepted: true };
    }),
    discardReleasedExecution: vi.fn((reference: TaskExecutionReference) => {
      log.push(`discard:${key(reference)}`);
      if (authority.get(key(reference)) === "fenced") authority.delete(key(reference));
    }),
    taskExecutionTargetOf: reference => key(reference) in ingress ? { root, execution: reference, ingressAgentRunId: ingress[key(reference)]! } : null,
    taskExecutionWithIngress: agentRunId => {
      const innermost = chains[agentRunId]?.[0];
      return innermost && ingress[key(innermost)] === agentRunId ? innermost : null;
    },
    containsTaskExecution: reference => key(reference) in ingress,
    publishTaskExecutionsClosed: vi.fn((references: readonly TaskExecutionReference[]) => { log.push(`closed:${references.map(key)}`); }),
    publishTaskExecutionsReopened: vi.fn((references: readonly TaskExecutionReference[]) => { log.push(`reopened:${references.map(key)}`); }),
    isLive: reference => authority.get(key(reference)) === "live",
    assertRestorableChain: agentRunId => {
      log.push(`restorable:${agentRunId}`);
      if (!control.restorable) throw new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", "The saved conversation is unavailable.");
    },
    restoreChain: async agentRunId => {
      for (const reference of chains[agentRunId] ?? []) {
        if (authority.get(key(reference)) === "live") continue;
        if (control.restoreFailure) throw control.restoreFailure;
        // A retained fenced authority cannot be re-activated (it is closed for input).
        if (authority.get(key(reference)) === "fenced") throw new Error(`AgentRun '${agentRunId}' is closed for input.`);
        log.push(`restore:${key(reference)}`);
        authority.set(key(reference), "live");
      }
    },
    tryShutDownIfQuiet: async () => false,
  };
  const lifecycle = new RootTaskExecutionLifecycle(adapter, { taskExecutionResources: resources, gracePeriodMs: () => 600_000 });
  const assign = async (agentRun: TaskExecutionReference, coordinatorAgentRunId?: string) => {
    await resources.linkNewTaskExecution({ role: "assigned", taskId: "task-A", assignedBy: "manager", recipientAddress: "/worker", hostRoot: root, execution: agentRun,
      ...(coordinatorAgentRunId ? { teamCoordinatorAgentRunId: coordinatorAgentRunId } : {}) });
    await resources.markStarted(agentRun);
    authority.set(key(agentRun), "live");
  };
  /** DONE: the Task side closes every entry, then this root stops (fences) exactly those runs. */
  const done = async (taskId = "task-A") => { await lifecycle.releaseTaskExecutions(resources.close(taskId)); log.length = 0; };
  /** `send_message_to(run ID)` as the root facades bind it: the target is woken and the message delivered. */
  const message = (sender: string, target: string) => lifecycle.deliverToExactTarget(sender, target,
    () => lifecycle.withLiveLease(target, async () => { log.push(`deliver:${target}`); return { accepted: true, message: `Delivered message to ${target}.` }; }));
  /** The root's exact delivery of an existing copy's new Task, bound as the roots bind it (woken under the copy's lease). */
  const delivered: Array<{ target: string; content: string; referenceFiles: readonly string[] }> = [];
  const deliverWork: DeliverTaskWork = (target, content, referenceFiles) => lifecycle.withLiveLease(target, async () => {
    if (control.deliveryRefusal) return control.deliveryRefusal;
    log.push(`deliver:${target}`);
    delivered.push({ target, content, referenceFiles });
    return { accepted: true };
  });
  const member = (agentRunId: string): { identity: CollaborationMemberExecutionIdentity } =>
    ({ identity: { root, memberAddress: `/${agentRunId}` as never, agentRunId } });
  /** `delegate_task(target_*_run_id, task_id)` from `sender`, as the roots bind it. */
  const assignTo = (copy: TaskExecutionReference, taskId: string, sender = "manager") =>
    lifecycle.assignToExistingCopy(member(sender), { copy, taskId }, deliverWork);
  return { resources, authority, log, control, adapter, lifecycle, assign, done, message, assignTo, delivered, deliverWork };
}

