import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RootTaskExecutionLifecycle } from "../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { InMemoryTaskAgentResources } from "../../fixtures/task-agent-resource-fixtures.js";
import type { RootTaskExecutionAdapter } from "../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js";
import { TaskDelegationError } from "../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import {
  taskExecutionReferenceKey,
  type TaskExecutionReference,
} from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";
import {
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** Far beyond the removed idle-shutdown delay (default 10 min, maximum 24 h). */
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1_000;

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
  chains: Map<string, TaskExecutionReference[]>;
  restorable: boolean;
  restoreFailure: Error | null;
  restoreCalls: string[];
};

const createFakeAdapter = (overrides: Partial<RootTaskExecutionAdapter<string>> = {}) => {
  const state: FakeState = {
    live: new Set(),
    chains: new Map(),
    restorable: true,
    restoreFailure: null,
    restoreCalls: [],
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
    registrationFor: () => null, taskExecutionAt: () => null,
    ownershipChainFor: (agentRunId) => state.chains.get(agentRunId) ?? [],
    cancelOwnedExecution: vi.fn(), releaseOwnedExecution: vi.fn(async () => ({ accepted: false, code: "UNAVAILABLE" })),
    taskExecutionChainFor: (agentRunId) => state.chains.get(agentRunId) ?? [],
    listTaskExecutions: () => [...new Map([...state.chains.values()].flat().map((reference) => [taskExecutionReferenceKey(reference), reference])).values()],
    taskExecutionStatus: (reference) => state.live.has(taskExecutionReferenceKey(reference)) ? "idle" : "offline",
    containsTaskExecution: () => false, publishTaskExecutionsClosed: vi.fn(),
    assertRestorableChain: (agentRunId) => {
      if (!state.restorable) {
        throw new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", `No saved context for ${agentRunId}.`);
      }
    },
    // Like the subject adapters: only non-live executions of the chain are restored (outermost first).
    restoreChain: async (agentRunId) => {
      state.restoreCalls.push(agentRunId);
      const chain = [...(state.chains.get(agentRunId) ?? [])].reverse();
      for (const reference of chain) {
        if (state.live.has(taskExecutionReferenceKey(reference))) continue;
        if (state.restoreFailure && state.live.size > 0) throw state.restoreFailure;
        state.live.add(taskExecutionReferenceKey(reference));
      }
    },
    ...overrides,
  };
  return { adapter, state };
};

const setup = (overrides: Partial<RootTaskExecutionAdapter<string>> = {}) => {
  const fake = createFakeAdapter(overrides);
  // Production always binds the Task side; every delegated copy belongs to a Task.
  const resources = new InMemoryTaskAgentResources();
  const lifecycle = new RootTaskExecutionLifecycle(fake.adapter, { taskAgentResources: resources });
  return { ...fake, lifecycle, resources };
};

const child: TaskExecutionReference = { agentRunId: "child-run" };
const team: TaskExecutionReference = { teamRunId: "task-team-run" };

describe("RootTaskExecutionLifecycle delegation result", () => {
  it("returns the spawned ingress run ID and the task_id of the Task with no Project it created (REQ-003/004)", async () => {
    const { lifecycle, resources } = setup();
    await expect(lifecycle.delegate({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .resolves.toEqual({ target_agent_run_id: "child-run", target_kind: "agent", task_id: "ad_hoc_task_1" });
    expect(resources.links).toEqual([expect.objectContaining({ role: "assigned", assignedBy: "coordinator-run",
      adHocTask: { description: "Do it", referenceFiles: [] }, agentRun: { agentRunId: "child-run" } })]);
    expect(resources.tasks.get("ad_hoc_task_1")).toEqual({ description: "Do it", referenceFiles: [], done: false, adHoc: true });
  });

  it("rejects description-only delegation before any planning when no Task side is bound", async () => {
    const fake = createFakeAdapter();
    const unbound = new RootTaskExecutionLifecycle(fake.adapter);
    await expect(unbound.delegate({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .rejects.toMatchObject({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" });
    expect(fake.adapter.planActivation).not.toHaveBeenCalled();
  });

  it("returns a null run ID with a message when nothing started, aborting the preparation", async () => {
    const abort = vi.fn(async () => undefined);
    const { lifecycle } = setup({
      beginActivation: () => ({ prepare: async () => ({ targetAgentRunId: "child-run",
        commit: async () => ({ committed: false, message: "tree write failed" }), acceptSeed: async () => ({ accepted: true }) }),
        cancel: () => undefined, release: async () => { await abort(); return { accepted: true }; } }),
    });
    await expect(lifecycle.delegate({ identity: caller }, { recipient_address: "/worker", description: "Do it" }, "placement"))
      .resolves.toEqual({ target_agent_run_id: null, message: "tree write failed" });

    const failing = setup({ planActivation: async () => { throw new Error("Agent '/missing' was not found."); } });
    await expect(failing.lifecycle.delegate({ identity: caller }, { recipient_address: "/missing", description: "Do it" }, "placement"))
      .resolves.toEqual({ target_agent_run_id: null, message: "Agent '/missing' was not found." });
  });

  it("builds the first message with the delegator address and run ID", async () => {
    const { lifecycle, adapter } = setup();
    await lifecycle.delegate({ identity: caller }, { recipient_address: "/worker", description: "Review the plan" }, "placement");
    const packet = vi.mocked(adapter.planActivation).mock.calls[0]![0].workPacket as AgentInputUserMessage;
    expect(packet.content).toContain("Task delegator address: /coordinator");
    expect(packet.content).toContain("Task delegator AgentRun ID: coordinator-run");
    expect(packet.content).toContain("Review the plan");
  });
});

describe("RootTaskExecutionLifecycle copy lifetime (no idle shutdown)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("keeps quiet delegated Agent and Team copies live far past the old idle-shutdown delay; status only reaches the Task side (AC-002)", async () => {
    vi.useFakeTimers();
    const { lifecycle, state, resources, adapter } = setup({ releaseOwnedExecution: vi.fn(async () => ({ accepted: true })) });
    state.chains.set("child-run", [child]);
    state.chains.set("member-run", [team]);
    state.live.add("agent:child-run");
    state.live.add("team:task-team-run");

    // Quiet statuses (idle, offline, error) of an agent in each copy, as the roots forward them.
    for (let report = 0; report < 3; report += 1) {
      lifecycle.onAgentStatus("child-run");
      lifecycle.onAgentStatus("member-run");
    }
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(TWO_DAYS_MS);
    await flush();

    expect(state.live).toEqual(new Set(["agent:child-run", "team:task-team-run"]));
    expect(adapter.releaseOwnedExecution).not.toHaveBeenCalled();
    expect(lifecycle.taskExecutionStatus(child)).toBe("idle");
    expect(lifecycle.taskExecutionStatus(team)).toBe("idle");
    expect(resources.statusChanges.map((change) => change.references)).toEqual([
      [child], [team], [child], [team], [child], [team],
    ]);

    // A same-root message reaches the live copy: nothing is rebuilt.
    const delivered = vi.fn(async () => ({ accepted: true as const }));
    await expect(lifecycle.withLiveChain("child-run", delivered)).resolves.toEqual({ accepted: true });
    await expect(lifecycle.withLiveChain("member-run", delivered)).resolves.toEqual({ accepted: true });
    expect(delivered).toHaveBeenCalledTimes(2);
    expect(state.live).toEqual(new Set(["agent:child-run", "team:task-team-run"]));
  });

  it("reports every task execution offline on root termination and on fail-stop", async () => {
    const terminated = setup();
    terminated.state.chains.set("child-run", [child]);
    terminated.state.live.add("agent:child-run");
    terminated.lifecycle.closeExternalAdmission();
    expect(terminated.lifecycle.taskExecutionStatus(child)).toBe("offline");
    expect(terminated.resources.statusChanges.at(-1)?.references).toEqual([child]);
    await expect(terminated.lifecycle.withLiveChain("child-run", async () => ({ accepted: true })))
      .resolves.toMatchObject({ accepted: false, code: "ROOT_RUN_NOT_ACTIVE" });

    const failStopped = setup();
    failStopped.state.chains.set("child-run", [child]);
    failStopped.lifecycle.enterRootFailStop();
    expect(failStopped.lifecycle.taskExecutionStatus(child)).toBe("offline");
    await expect(failStopped.lifecycle.withLiveChain("child-run", async () => ({ accepted: true })))
      .resolves.toMatchObject({ accepted: false, code: "ROOT_RUN_NOT_ACTIVE" });
    expect(failStopped.state.restoreCalls).toEqual([]);
  });
});

describe("RootTaskExecutionLifecycle withLiveChain (restore before delivery)", () => {
  it("restores a non-live chain (after a restart) before running the operation", async () => {
    const { lifecycle, state } = setup();
    state.chains.set("child-run", [child]);
    const order: string[] = [];
    const result = await lifecycle.withLiveChain("child-run", async () => {
      order.push(`deliver:live=${state.live.has("agent:child-run")}`);
      return { accepted: true };
    });
    expect(result).toEqual({ accepted: true });
    expect(state.restoreCalls).toEqual(["child-run"]);
    expect(order).toEqual(["deliver:live=true"]);
  });

  it("refuses with TASK_EXECUTION_CONTEXT_UNAVAILABLE before any restore (AC-011)", async () => {
    const { lifecycle, state } = setup();
    state.chains.set("child-run", [child]);
    state.restorable = false;
    const operation = vi.fn(async () => ({ accepted: true as const }));
    await expect(lifecycle.withLiveChain("child-run", operation)).resolves.toMatchObject({
      accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
    });
    expect(operation).not.toHaveBeenCalled();
    expect(state.restoreCalls).toEqual([]);
    expect(state.live.size).toBe(0);
  });

  it("converts restore errors to TASK_EXECUTION_RESTORE_FAILED and runs nothing", async () => {
    const { lifecycle, state } = setup();
    state.chains.set("nested-run", [child, team]);
    state.restoreFailure = new Error("provider session unavailable");
    const operation = vi.fn(async () => ({ accepted: true as const }));
    await expect(lifecycle.withLiveChain("nested-run", operation)).resolves.toMatchObject({
      accepted: false, code: "TASK_EXECUTION_RESTORE_FAILED",
    });
    expect(operation).not.toHaveBeenCalled();
    // The outer Team was restored before the failure and stays live; nothing shuts it down.
    expect(state.live.has("team:task-team-run")).toBe(true);
  });

  it("refuses input to closed Task work (Task DONE) without restoring it", async () => {
    const { lifecycle, state, resources } = setup();
    state.chains.set("child-run", [child]);
    resources.addTask("A");
    await resources.linkAgentRun({ role: "assigned", taskId: "A", assignedBy: "coordinator-run", hostRoot: caller.root, agentRun: child });
    resources.close("A");
    const operation = vi.fn(async () => ({ accepted: true as const }));
    await expect(lifecycle.withLiveChain("child-run", operation)).resolves.toMatchObject({
      accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED",
    });
    expect(operation).not.toHaveBeenCalled();
    expect(state.restoreCalls).toEqual([]);
  });

  it("runs the operation directly for agents outside any delegated child", async () => {
    const { lifecycle, state } = setup();
    await expect(lifecycle.withLiveChain("coordinator-run", async () => ({ accepted: true }))).resolves.toEqual({ accepted: true });
    expect(state.restoreCalls).toEqual([]);
  });
});
