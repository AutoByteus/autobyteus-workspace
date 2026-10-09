import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RootTaskExecutionLifecycle } from "../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import type {
  PreparedTaskExecutionActivation,
  RootTaskExecutionAdapter,
} from "../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js";
import {
  TaskDelegationError,
  TaskExecutionTeardownIndeterminateError,
} from "../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdleTimers } from "../../../src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import {
  taskExecutionReferenceKey,
  type TaskExecutionReference,
} from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import {
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const GRACE = 600_000;

/** Controllable clock: timers fire only when `advance` crosses their deadline. */
class ManualTimers implements TaskExecutionIdleTimers {
  now = 0;
  private next = 1;
  private readonly timers = new Map<number, { due: number; callback: () => void }>();
  setTimeout = (callback: () => void, delayMs: number): unknown => {
    const id = this.next++;
    this.timers.set(id, { due: this.now + delayMs, callback });
    return id;
  };
  clearTimeout = (handle: unknown): void => { this.timers.delete(handle as number); };
  pendingCount(): number { return this.timers.size; }
  advance(ms: number): void {
    this.now += ms;
    for (const [id, timer] of [...this.timers].sort(([, a], [, b]) => a.due - b.due)) {
      if (timer.due > this.now) continue;
      this.timers.delete(id);
      timer.callback();
    }
  }
}

const flush = async (): Promise<void> => {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

const caller = createCollaborationMemberExecutionIdentity({
  root: createTeamRootExecutionIdentity("root-1"),
  memberAddress: "/coordinator",
  agentRunId: "coordinator-run",
});

type FakeState = {
  live: Set<string>;
  quiet: Set<string>;
  chains: Map<string, TaskExecutionReference[]>;
  restorable: boolean;
  restoreFailure: Error | null;
  restoreCalls: string[];
  shutdownCalls: string[];
};

const createFakeAdapter = (overrides: Partial<RootTaskExecutionAdapter<string>> = {}) => {
  const state: FakeState = {
    live: new Set(),
    quiet: new Set(),
    chains: new Map(),
    restorable: true,
    restoreFailure: null,
    restoreCalls: [],
    shutdownCalls: [],
  };
  const adapter: RootTaskExecutionAdapter<string> = {
    isOpen: () => true,
    authorize: () => undefined,
    assertCurrentSchemaReady: () => undefined,
    root: caller.root,
    planActivation: vi.fn(async input => ({ ...input, ownedAgentRunIds: ["child-run"],
      target: { root: caller.root, execution: { agentRunId: "child-run" }, ingressAgentRunId: "child-run" } })),
    beginActivation: vi.fn(() => ({ prepare: async () => ({ targetAgentRunId: "child-run",
      commit: async () => ({ committed: true }), acceptSeed: async guard => { guard(); return { accepted: true }; } }),
      cancel: vi.fn(), release: vi.fn(async () => ({ accepted: true })), })),
    registrationFor: () => null, taskExecutionAt: () => null, taskExecutionTargetOf: () => null,
    ownershipChainFor: (agentRunId) => state.chains.get(agentRunId) ?? [],
    cancelOwnedExecution: vi.fn(), releaseOwnedExecution: vi.fn(async () => ({ accepted: false, code: "UNAVAILABLE" })),
    taskExecutionChainFor: (agentRunId) => state.chains.get(agentRunId) ?? [],
    listTaskExecutions: () => [...new Map([...state.chains.values()].flat().map((reference) => [taskExecutionReferenceKey(reference), reference])).values()],
    taskExecutionStatus: (reference) => state.live.has(taskExecutionReferenceKey(reference)) ? "idle" : "offline",
    containsTaskExecution: () => false, publishTaskExecutionsClosed: vi.fn(),
    isLive: (reference) => state.live.has(taskExecutionReferenceKey(reference)),
    assertRestorableChain: (agentRunId) => {
      if (!state.restorable) {
        throw new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", `No saved context for ${agentRunId}.`);
      }
    },
    restoreChain: async (agentRunId) => {
      state.restoreCalls.push(agentRunId);
      const chain = [...(state.chains.get(agentRunId) ?? [])].reverse();
      for (const reference of chain) {
        if (state.restoreFailure && state.live.size > 0) throw state.restoreFailure;
        state.live.add(taskExecutionReferenceKey(reference));
      }
    },
    tryShutDownIfQuiet: async (reference) => {
      const key = taskExecutionReferenceKey(reference);
      state.shutdownCalls.push(key);
      if (!state.quiet.has(key)) return false;
      state.live.delete(key);
      return true;
    },
    ...overrides,
  };
  return { adapter, state };
};

const setup = (overrides: Partial<RootTaskExecutionAdapter<string>> = {}, grace = GRACE) => {
  const timers = new ManualTimers();
  const fake = createFakeAdapter(overrides);
  let currentGrace = grace;
  // Production always binds the Task side; every delegated copy belongs to a Task.
  const resources = new InMemoryTaskExecutionResources();
  const lifecycle = new RootTaskExecutionLifecycle(fake.adapter, { gracePeriodMs: () => currentGrace, timers, taskExecutionResources: resources });
  return { ...fake, timers, lifecycle, resources, setGrace: (value: number) => { currentGrace = value; } };
};

const child: TaskExecutionReference = { agentRunId: "child-run" };
const team: TaskExecutionReference = { teamRunId: "task-team-run" };

describe("RootTaskExecutionLifecycle delegation result", () => {
  it("returns the spawned ingress run ID and the task_id of the Task with no Project it created (REQ-003/004)", async () => {
    const { lifecycle, resources } = setup();
    await expect(lifecycle.delegateToNewCopy({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .resolves.toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "child-run" }, taskId: "ad_hoc_task_1" });
    expect(resources.links).toEqual([expect.objectContaining({ role: "assigned", assignedBy: "coordinator-run",
      adHocTask: { description: "Do it", referenceFiles: [] }, execution: { agentRunId: "child-run" } })]);
    expect(resources.tasks.get("ad_hoc_task_1")).toEqual({ description: "Do it", referenceFiles: [], done: false, adHoc: true });
  });

  it("rejects description-only delegation before any planning when no Task side is bound", async () => {
    const fake = createFakeAdapter();
    const unbound = new RootTaskExecutionLifecycle(fake.adapter, { gracePeriodMs: () => GRACE, timers: new ManualTimers() });
    await expect(unbound.delegateToNewCopy({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .rejects.toMatchObject({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" });
    expect(fake.adapter.planActivation).not.toHaveBeenCalled();
  });

  it("returns delegated: false with a message when nothing started, aborting the preparation", async () => {
    const abort = vi.fn(async () => undefined);
    const { lifecycle } = setup({
      beginActivation: () => ({ prepare: async () => ({ targetAgentRunId: "child-run",
        commit: async () => ({ committed: false, message: "tree write failed" }), acceptSeed: async () => ({ accepted: true }) }),
        cancel: () => undefined, release: async () => { await abort(); return { accepted: true }; } }),
    });
    await expect(lifecycle.delegateToNewCopy({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .resolves.toEqual({ delegated: false, message: "tree write failed" });

    const failing = setup({ planActivation: async () => { throw new Error("Agent '/missing' was not found."); } });
    await expect(failing.lifecycle.delegateToNewCopy({ identity: caller }, { recipient_address: "/missing", description: "Do it" }, "placement"))
      .resolves.toEqual({ delegated: false, message: "Agent '/missing' was not found." });
  });

  it("builds the first message with the delegator address and run ID", async () => {
    const { lifecycle, adapter } = setup();
    await lifecycle.delegateToNewCopy({ identity: caller }, { recipient_address: "/worker", description: "Review the plan" }, "placement");
    const packet = vi.mocked(adapter.planActivation).mock.calls[0]![0].workPacket as AgentInputUserMessage;
    expect(packet.content).toContain("Task delegator address: /coordinator");
    expect(packet.content).toContain("Task delegator AgentRun ID: coordinator-run");
    expect(packet.content).toContain("Review the plan");
  });
});

describe("RootTaskExecutionLifecycle idle shutdown", () => {
  it("shuts a quiet child down after the grace period, not before (AC-004)", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");

    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE - 1);
    await flush();
    expect(state.shutdownCalls).toEqual([]);
    timers.advance(1);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
    expect(state.live.has("agent:child-run")).toBe(false);
  });

  it("cancels on running work and restarts the countdown at the next quiet moment (AC-005)", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");

    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE / 2);
    lifecycle.onAgentStatus("child-run", "running");
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual([]);
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE - 1);
    await flush();
    expect(state.shutdownCalls).toEqual([]);
    timers.advance(1);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
  });

  it("arms on error status so an errored child is still released (AR-001)", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "error");
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
  });

  it("never shuts down work that the fire-time quiescence check rejects (approval pending, running turn)", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
    expect(state.live.has("agent:child-run")).toBe(true);
    expect(timers.pendingCount()).toBe(0);
    state.quiet.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(state.live.has("agent:child-run")).toBe(false);
  });

  it("arms every live execution in the chain and ignores executions that are already shut down", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("member-run", [team]);
    state.chains.set("nested-run", [child, team]);
    state.live.add("team:task-team-run");
    lifecycle.onAgentStatus("nested-run", "offline");
    expect(timers.pendingCount()).toBe(1);
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual(["team:task-team-run"]);
  });

  it("reads the grace period at arm time", async () => {
    const { lifecycle, state, timers, setGrace } = setup();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");
    setGrace(120_000);
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(120_000);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
  });

  it("disposes every timer on root termination and on fail-stop", async () => {
    const terminated = setup();
    terminated.state.chains.set("child-run", [child]);
    terminated.state.live.add("agent:child-run");
    terminated.state.quiet.add("agent:child-run");
    terminated.lifecycle.onAgentStatus("child-run", "idle");
    terminated.lifecycle.closeExternalAdmission();
    expect(terminated.timers.pendingCount()).toBe(0);
    terminated.lifecycle.onAgentStatus("child-run", "idle");
    expect(terminated.timers.pendingCount()).toBe(0);

    const failStopped = setup();
    failStopped.state.chains.set("child-run", [child]);
    failStopped.state.live.add("agent:child-run");
    failStopped.lifecycle.onAgentStatus("child-run", "idle");
    failStopped.lifecycle.enterRootFailStop();
    expect(failStopped.timers.pendingCount()).toBe(0);
    await expect(failStopped.lifecycle.acquireLiveLease("child-run")).rejects.toMatchObject({ code: "ROOT_RUN_NOT_ACTIVE" });
  });

  it("logs and survives a teardown-indeterminate shutdown failure raised by the adapter", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { lifecycle, state, timers } = setup({
      tryShutDownIfQuiet: async () => { throw new TaskExecutionTeardownIndeterminateError("child-run", "did not finish"); },
    });
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("RootTaskExecutionLifecycle background-task waits (hybrid idle shutdown)", () => {
  /** The adapter's fire-time quiet check, as AgentRunTermination answers it: not quiet while a background task runs. */
  const setupWithBackgroundTasks = () => {
    const running = new Set<string>();
    const fake = setup({
      tryShutDownIfQuiet: async (reference) => {
        const key = taskExecutionReferenceKey(reference);
        fake.state.shutdownCalls.push(key);
        if (running.has(key) || !fake.state.quiet.has(key)) return false;
        fake.state.live.delete(key);
        return true;
      },
    });
    return { ...fake, running };
  };

  it("does not shut a quiet copy down while its background task runs, however long; the task's end re-arms one grace period (AC-001/002/004)", async () => {
    const { lifecycle, state, timers, running } = setupWithBackgroundTasks();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");
    running.add("agent:child-run");

    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    // The fire-time check skipped the shutdown and set no new timer: no time limit while the task runs.
    expect(state.live.has("agent:child-run")).toBe(true);
    expect(timers.pendingCount()).toBe(0);
    timers.advance(24 * GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);

    // The task ends with no following turn (AGY daemon exit): one grace period later the quiet copy is shut down.
    running.delete("agent:child-run");
    lifecycle.onAgentBackgroundTaskEnded("child-run");
    expect(timers.pendingCount()).toBe(1);
    timers.advance(GRACE - 1);
    await flush();
    expect(state.live.has("agent:child-run")).toBe(true);
    timers.advance(1);
    await flush();
    expect(state.live.has("agent:child-run")).toBe(false);
  });

  it("re-arms through the idle that follows a completion turn, which replaces the end's timer (AC-005)", async () => {
    const { lifecycle, state, timers, running } = setupWithBackgroundTasks();
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    state.quiet.add("agent:child-run");
    running.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();

    // Claude: the completion ends the task and the CLI starts a turn, then the agent goes idle again.
    running.delete("agent:child-run");
    lifecycle.onAgentBackgroundTaskEnded("child-run");
    lifecycle.onAgentStatus("child-run", "running");
    expect(timers.pendingCount()).toBe(0);
    timers.advance(GRACE / 2);
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE - 1);
    await flush();
    expect(state.live.has("agent:child-run")).toBe(true);
    timers.advance(1);
    await flush();
    expect(state.live.has("agent:child-run")).toBe(false);
  });

  it("keeps a Team copy live while one member's task runs; that member's task end re-arms the whole chain (AC-003)", async () => {
    const { lifecycle, state, timers, running } = setupWithBackgroundTasks();
    state.chains.set("member-run", [team]);
    state.chains.set("lead-run", [team]);
    state.live.add("team:task-team-run");
    state.quiet.add("team:task-team-run");
    // A Team is quiet only when every member is: one member's running task makes the Team not quiet.
    running.add("team:task-team-run");
    lifecycle.onAgentStatus("lead-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(state.live.has("team:task-team-run")).toBe(true);
    expect(timers.pendingCount()).toBe(0);

    running.delete("team:task-team-run");
    lifecycle.onAgentBackgroundTaskEnded("member-run");
    timers.advance(GRACE);
    await flush();
    expect(state.live.has("team:task-team-run")).toBe(false);
  });

  it("ignores a task end for an agent outside every copy, for a copy that is not live, and after the root stops admitting", async () => {
    const { lifecycle, state, timers } = setupWithBackgroundTasks();
    lifecycle.onAgentBackgroundTaskEnded("coordinator-run");
    expect(timers.pendingCount()).toBe(0);
    state.chains.set("child-run", [child]);
    lifecycle.onAgentBackgroundTaskEnded("child-run");
    expect(timers.pendingCount()).toBe(0);
    state.live.add("agent:child-run");
    lifecycle.closeExternalAdmission();
    lifecycle.onAgentBackgroundTaskEnded("child-run");
    expect(timers.pendingCount()).toBe(0);
  });
});

describe("RootTaskExecutionLifecycle wake leases", () => {
  it("restores a shut-down chain, holds it against shutdown, and arms it on release (AR-001b)", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("child-run", [child]);
    state.quiet.add("agent:child-run");

    const lease = await lifecycle.acquireLiveLease("child-run");
    expect(state.restoreCalls).toEqual(["child-run"]);
    expect(state.live.has("agent:child-run")).toBe(true);
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual([]);
    expect(state.live.has("agent:child-run")).toBe(true);

    lease.release();
    expect(timers.pendingCount()).toBe(1);
    timers.advance(GRACE);
    await flush();
    expect(state.shutdownCalls).toEqual(["agent:child-run"]);
  });

  it("restores a child whose wake arrives while its shutdown is in flight, after the shutdown completes (QR-002)", async () => {
    let finishShutdown!: () => void;
    const order: string[] = [];
    const { lifecycle, state, timers } = setup({
      tryShutDownIfQuiet: async (reference) => {
        const key = taskExecutionReferenceKey(reference);
        order.push(`shutdown-start:${key}`);
        await new Promise<void>((resolve) => { finishShutdown = resolve; });
        state.live.delete(key);
        order.push(`shutdown-end:${key}`);
        return true;
      },
    });
    state.chains.set("child-run", [child]);
    state.live.add("agent:child-run");
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(order).toEqual(["shutdown-start:agent:child-run"]);

    // The message arrives mid-shutdown: its wake queues behind the shutdown instead of racing it.
    let leased = false;
    const leasePromise = lifecycle.acquireLiveLease("child-run").then((lease) => { leased = true; return lease; });
    await flush();
    expect(leased).toBe(false);
    expect(state.restoreCalls).toEqual([]);

    finishShutdown();
    const lease = await leasePromise;
    expect(order).toEqual(["shutdown-start:agent:child-run", "shutdown-end:agent:child-run"]);
    expect(state.restoreCalls).toEqual(["child-run"]);
    expect(state.live.has("agent:child-run")).toBe(true);
    // Held live for delivery: a grace fire while leased cannot shut it down again.
    lifecycle.onAgentStatus("child-run", "idle");
    timers.advance(GRACE);
    await flush();
    expect(order).toHaveLength(2);
    lease.release();
    expect(timers.pendingCount()).toBe(1);
  });

  it("rejects with TASK_EXECUTION_CONTEXT_UNAVAILABLE before any restore (AC-011)", async () => {
    const { lifecycle, state } = setup();
    state.chains.set("child-run", [child]);
    state.restorable = false;
    await expect(lifecycle.acquireLiveLease("child-run")).rejects.toMatchObject({ code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(state.restoreCalls).toEqual([]);
    expect(state.live.size).toBe(0);
  });

  it("converts restore errors to TASK_EXECUTION_RESTORE_FAILED and arms executions restored before the failure", async () => {
    const { lifecycle, state, timers } = setup();
    state.chains.set("nested-run", [child, team]);
    state.restoreFailure = new Error("provider session unavailable");
    await expect(lifecycle.acquireLiveLease("nested-run")).rejects.toMatchObject({
      code: "TASK_EXECUTION_RESTORE_FAILED",
    });
    expect(state.live.has("team:task-team-run")).toBe(true);
    expect(timers.pendingCount()).toBe(1);
  });

  it("returns a no-op lease for agents outside any delegated child", async () => {
    const { lifecycle, state, timers } = setup();
    const lease = await lifecycle.acquireLiveLease("coordinator-run");
    lease.release();
    expect(state.restoreCalls).toEqual([]);
    expect(timers.pendingCount()).toBe(0);
  });
});
