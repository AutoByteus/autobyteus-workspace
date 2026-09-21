import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootTaskLifecycleAdapter } from "../../../src/agent-collaboration/execution/task/root-task-lifecycle-adapter.js";
import { RootTaskLifecycleEngine } from "../../../src/agent-collaboration/execution/task/root-task-lifecycle-engine.js";
import { buildTaskAssigneeWorkPacket } from "../../../src/agent-collaboration/execution/task/root-task-lifecycle-input.js";
import type { TaskDelegationRecordV1 } from "../../../src/agent-collaboration/execution/task/task-delegation-record-v1.js";
import { RootTaskPersistenceFinalizationIndeterminateError } from "../../../src/agent-collaboration/execution/task/task-lifecycle-command.js";

const root = createTeamRootExecutionIdentity("root-team-run");
const delegator = createCollaborationMemberExecutionIdentity({
  root,
  memberAddress: "/coordinator",
  agentRunId: "coordinator-run",
});
type Placement = Readonly<{ address: "/researcher" }>;

const createHarness = (input: {
  records?: readonly TaskDelegationRecordV1[];
  schemaError?: Error;
  notify?: RootTaskLifecycleAdapter<Placement>["deliverSystemMessage"];
  activationError?: Error;
  settlementReady?: (task: TaskDelegationRecordV1) => boolean;
} = {}) => {
  let records = input.records ?? [];
  const settled = new Set<string>();
  const events: string[] = [];
  const settlementOrder: string[] = [];
  const settlementAttempts: string[] = [];
  const abort = vi.fn(async () => undefined);
  const adapter: RootTaskLifecycleAdapter<Placement> = {
    initialRecords: records,
    isOpen: () => true,
    authorize: (identity) => {
      if (identity.root.rootRunId !== root.rootRunId) throw new Error("wrong root");
    },
    assertCurrentSchemaReady: () => { if (input.schemaError) throw input.schemaError; },
    prepareActivation: async (prepared) => ({
      recipientAddress: prepared.placement.address,
      taskExecution: Object.freeze({ agentRunId: `agent-${prepared.taskId}` }),
      targetAgentRunId: `agent-${prepared.taskId}`,
      commit: async (commit) => {
        if (input.activationError) throw input.activationError;
        commit.commitRecords();
        records = commit.nextRecords;
        events.push(commit.event.kind);
        return { committed: true as const };
      },
      abort,
    }),
    commitRecordTransition: async (transition) => {
      transition.commitRecords();
      records = transition.nextRecords;
      if (transition.event) events.push(transition.event.kind);
    },
    taskAssigneeAgentRunId: (task) => "agentRunId" in task.taskExecution
      ? task.taskExecution.agentRunId
      : `coordinator-${task.taskExecution.teamRunId}`,
    taskOwnsAgent: (task, agentRunId) => task.taskId === "parent" && agentRunId === "agent-child",
    isTaskExecutionSettled: (task) => settled.has(task.taskId),
    settleTaskExecution: async (command) => {
      settlementAttempts.push(command.task.taskId);
      if (command.remainsBlockedByOpenChild()) return false;
      if (input.settlementReady && !input.settlementReady(command.task)) return false;
      settlementOrder.push(command.task.taskId);
      settled.add(command.task.taskId);
      events.push(command.event.kind);
      return true;
    },
    enterLifecycleFailStop: vi.fn(),
    deliverSystemMessage: input.notify ?? (async () => ({ accepted: true })),
  };
  const engine = new RootTaskLifecycleEngine(adapter);
  return { engine, abort, events, settlementAttempts, settlementOrder, records: () => records };
};

const terminal = (input: {
  taskId: string;
  agentRunId: string;
  delegatorAgentRunId?: string;
  status?: "active";
}): TaskDelegationRecordV1 => Object.freeze({
  taskId: input.taskId,
  delegatorAgentRunId: input.delegatorAgentRunId ?? delegator.agentRunId,
  recipientAddress: "/researcher",
  taskExecution: Object.freeze({ agentRunId: input.agentRunId }),
  description: input.taskId,
  referenceFiles: Object.freeze([]),
  status: input.status ?? "active",
  updates: Object.freeze([]),
  createdAt: "2026-09-01T00:00:00.000Z",
});

describe("root-neutral current task lifecycle invariants", () => {
  it("checks current-schema readiness before task preparation", async () => {
    const harness = createHarness({ schemaError: new Error("TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED") });
    await expect(harness.engine.delegateTask(
      { identity: delegator },
      { recipient_address: "/researcher", description: "work" },
      { address: "/researcher" },
    )).rejects.toThrow("TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED");
    expect(harness.records()).toEqual([]);
    expect(harness.abort).not.toHaveBeenCalled();
  });

  it("builds the bound assignee packet without exposing a task id", () => {
    const message = buildTaskAssigneeWorkPacket({
      delegator,
      description: "Investigate the failing scenario.",
      referenceFiles: ["/tmp/evidence.log"],
    });
    expect(message.content).toContain("Task delegator address: /coordinator");
    expect(message.content).toContain("Task delegator AgentRun ID: coordinator-run");
    expect(message.content).toContain("/tmp/evidence.log");
    expect(message.content).not.toContain("task_");
    expect(message.metadata).toMatchObject({ task_delegation_system_task_notification: true, suppress_system_task_notification: true });
  });

  it("settles terminal descendants before their owning parent during shutdown", async () => {
    const parent = terminal({ taskId: "parent", agentRunId: "agent-parent" });
    const child = terminal({ taskId: "child", agentRunId: "agent-child", delegatorAgentRunId: "agent-child", status: "active" });
    const harness = createHarness({ records: [parent, child] });
    await harness.engine.shutdownAndSettle("root stopping");
    expect(harness.settlementOrder).toEqual(["child", "parent"]);
    expect(harness.records().find((task) => task.taskId === "child")?.status).toBe("interrupted");
  });

  it("releases the one FIFO when terminal settlement is not quiescent and retries on idle", async () => {
    let ready = false;
    const active = terminal({ taskId: "accepted-later", agentRunId: "agent-active" });
    const harness = createHarness({
      records: [active],
      settlementReady: () => ready,
    });
    const assignee = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: "/researcher",
      agentRunId: "agent-active",
    });

    await expect(harness.engine.submitTaskResult(
      { identity: assignee },
      { message: "independent supported result" },
    )).resolves.toMatchObject({ status: "awaiting_review" });
    await expect(harness.engine.reviewTaskResult(
      { identity: delegator },
      { task_id: "accepted-later", decision: "accept" },
    )).resolves.toMatchObject({ status: "accepted" });
    await vi.waitFor(() => expect(harness.settlementAttempts).toEqual(["accepted-later"]));

    expect(harness.settlementOrder).toEqual([]);
    await expect(harness.engine.delegateTask(
      { identity: delegator },
      { recipient_address: "/researcher", description: "unrelated supported command" },
      { address: "/researcher" },
    )).resolves.toMatchObject({ status: "active" });
    expect(harness.records()).toHaveLength(2);

    ready = true;
    harness.engine.onExecutionBecameIdle();
    await vi.waitFor(() => expect(harness.settlementOrder).toEqual(["accepted-later"]));
    expect(harness.settlementAttempts).toEqual(["accepted-later", "accepted-later"]);
  });

  it("does not abort prepared work after persistence finalization becomes indeterminate", async () => {
    const error = new RootTaskPersistenceFinalizationIndeterminateError(
      "agent_team",
      "task_records",
      "post_durability_publication",
    );
    const harness = createHarness({ activationError: error });
    await expect(harness.engine.delegateTask(
      { identity: delegator },
      { recipient_address: "/researcher", description: "work" },
      { address: "/researcher" },
    )).rejects.toBe(error);
    expect(harness.abort).not.toHaveBeenCalled();
  });
});


it("preserves the saved result when a separately marked system notification is rejected", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "task-notification-"));
  const report = path.join(directory, "report.md");
  await fs.writeFile(report, "Retained report");
  try {
    const notify = vi.fn(async () => ({ accepted: false, code: "NOT_ACTIVE", message: "recipient inactive" }));
    const harness = createHarness({ records: [terminal({ taskId: "task", agentRunId: "agent-task" })], notify });
    const actor = createCollaborationMemberExecutionIdentity({ root, agentRunId: "agent-task", memberAddress: "/researcher" });
    const result = await harness.engine.submitTaskResult({ identity: actor }, { message: "Saved result", reference_files: [report] });
    expect(result).toMatchObject({ task_id: "task", status: "awaiting_review" });
    expect(result.message).toBeTruthy();
    expect(harness.records()[0]).toMatchObject({ status: "awaiting_review", updates: [{ message: "Saved result", referenceFiles: [report] }] });
    expect(harness.events).toEqual(["submitted"]);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith("coordinator-run", expect.objectContaining({ metadata: expect.objectContaining({
      task_delegation_system_task_notification: true, suppress_system_task_notification: true,
    }) }));
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
