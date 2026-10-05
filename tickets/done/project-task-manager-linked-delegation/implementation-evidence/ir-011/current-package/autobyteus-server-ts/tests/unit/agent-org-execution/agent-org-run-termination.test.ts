import { describe, expect, it, vi } from "vitest";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";

describe("AgentOrgRun termination stabilization", () => {
  it("freezes and fences every direct/mounted Agent scope before task and persistence drain", async () => {
    const orgRunId = "org-termination-run";
    const order: string[] = [];
    const directHandle = {
      fenceForRootShutdown: vi.fn(async () => {
        order.push("direct-agent-fence");
        return { accepted: true as const };
      }),
      terminate: vi.fn(async () => {
        order.push("direct-agent-finish");
        return { accepted: true as const };
      }),
    };
    const mountedScope = {
      fenceAgentRunsForRootShutdown: vi.fn(async () => {
        order.push("mounted-team-fence");
        return { accepted: true as const };
      }),
      finish: vi.fn(async () => {
        order.push("mounted-team-finish");
        return { accepted: true as const };
      }),
    };
    const rootAgents = {
      listHandles: vi.fn(() => []),
      freezeForRootTermination: vi.fn(() => {
        order.push("freeze-direct-agents");
        return [directHandle];
      }),
    };
    const teams = {
      list: vi.fn(() => []),
      freezeForRootTermination: vi.fn(() => {
        order.push("freeze-mounted-teams");
        return [mountedScope];
      }),
    };
    const persistence = {
      drain: vi.fn(async () => { order.push("persistence-drain"); }),
    };
    const publisher = new RootEventPublisher<AgentOrgRunEvent>();
    const run = new AgentOrgRun({
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      tree: testAgentOrgExecutionTree({
        orgRunId,
        members: [testOrgAgentNode("/lead", "lead-run")],
      }),
      messages: Object.freeze({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        messages: Object.freeze([]),
      }),
      rootAgents: rootAgents as never,
      teams: teams as never,
      callbacks: {} as never,
      persistence: persistence as never,
      publisher,
      taskExecutionIdentity: {} as never,
    });
    run.activate();
    const taskExecutions = (run as never as {
      taskExecutions: { drain(): Promise<void> };
    }).taskExecutions;
    vi.spyOn(taskExecutions, "drain").mockImplementation(async () => {
      order.push("task-drain");
    });

    await expect(run.terminate()).resolves.toEqual({ accepted: true });

    expect(order).toEqual([
      "freeze-direct-agents",
      "freeze-mounted-teams",
      "direct-agent-fence",
      "mounted-team-fence",
      "task-drain",
      "persistence-drain",
      "mounted-team-finish",
      "direct-agent-finish",
    ]);
  });
});

describe("AgentOrgRun termination retry after a failed attempt", () => {
  const orgRunId = "org-retry-run";
  type Result = { accepted: boolean; code?: string; message?: string };
  const build = (input: {
    handleTerminate: () => Promise<Result>;
    handleFence?: () => Promise<Result>;
  }) => {
    const onTerminated = vi.fn();
    const handle = {
      fenceForRootShutdown: vi.fn(input.handleFence ?? (async () => ({ accepted: true }))),
      terminate: vi.fn(input.handleTerminate),
    };
    const persistence = { drain: vi.fn(async () => undefined), enterRootFailStop: vi.fn() };
    const run = new AgentOrgRun({
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      tree: testAgentOrgExecutionTree({ orgRunId, members: [testOrgAgentNode("/lead", "lead-run")] }),
      messages: Object.freeze({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: Object.freeze([]) }),
      rootAgents: { listHandles: vi.fn(() => []), freezeForRootTermination: vi.fn(() => [handle]) } as never,
      teams: { list: vi.fn(() => []), freezeForRootTermination: vi.fn(() => []) } as never,
      callbacks: {} as never,
      persistence: persistence as never,
      publisher: new RootEventPublisher<AgentOrgRunEvent>(),
      taskExecutionIdentity: {} as never,
      onTerminated,
    });
    run.activate();
    const taskExecutions = (run as never as {
      taskExecutions: { drain(): Promise<void>; enterRootFailStop(): void };
    }).taskExecutions;
    const drain = vi.spyOn(taskExecutions, "drain").mockResolvedValue(undefined);
    vi.spyOn(taskExecutions, "enterRootFailStop").mockImplementation(() => undefined);
    return { run, handle, onTerminated, drain };
  };

  it("retries a termination whose local finish rejected (dead member) instead of replaying the failure", async () => {
    const f = build({ handleTerminate: vi.fn<() => Promise<Result>>()
      .mockRejectedValueOnce(new Error("Agent run 'lead-run' is not the current published run."))
      .mockResolvedValue({ accepted: true }) });

    await expect(f.run.terminate()).rejects.toThrow("not the current published run");
    expect(f.run.isActive()).toBe(false);
    expect(f.onTerminated).not.toHaveBeenCalled();

    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.handle.terminate).toHaveBeenCalledTimes(2);
    expect(f.onTerminated).toHaveBeenCalledOnce();
    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.handle.terminate).toHaveBeenCalledTimes(2);
  });

  it("retains the same frozen finish authority after an unaccepted stop, without unregistering", async () => {
    const f = build({ handleTerminate: vi.fn<() => Promise<Result>>()
      .mockResolvedValueOnce({ accepted: false, code: "EXACT_PROCESS_EXIT_PENDING" })
      .mockResolvedValue({ accepted: true }) });
    await expect(f.run.terminate()).resolves.toMatchObject({ accepted: false });
    expect(f.onTerminated).not.toHaveBeenCalled();
    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.handle.terminate).toHaveBeenCalledTimes(2);
    expect(f.onTerminated).toHaveBeenCalledOnce();
    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.handle.terminate).toHaveBeenCalledTimes(2);
  });

  it("re-fences after an unaccepted fence", async () => {
    const f = build({
      handleTerminate: async () => ({ accepted: true }),
      handleFence: vi.fn<() => Promise<Result>>()
        .mockResolvedValueOnce({ accepted: false, code: "FENCE_REJECTED" })
        .mockResolvedValue({ accepted: true }),
    });

    await expect(f.run.terminate()).resolves.toMatchObject({ accepted: false, code: "FENCE_REJECTED" });
    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.handle.fenceForRootShutdown).toHaveBeenCalledTimes(2);
    expect(f.onTerminated).toHaveBeenCalledOnce();
  });

  it("a first Stop fails on a rejected interrupt of a finishing turn; a second Stop reaches the AgentRun again and succeeds (SR-006)", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      // A real AgentRun behind the member handle: a busy turn whose interrupt the runtime rejects ("no active turn").
      let snapshot: AgentRuntimeLifecycleSnapshot = { availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-busy" } };
      let publish: ((events: readonly AgentRunEvent[]) => Promise<void> | void) | null = null;
      const context = new AgentRunContext({ runId: "lead-run", runtimeContext: null, config: new AgentRunConfig({
        runtimeKind: "codex_app_server", agentDefinitionId: "lead", llmModelIdentifier: "m", autoExecuteTools: false, workspaceId: null, llmConfig: null,
      }) });
      const backendInterrupt = vi.fn(async () => ({ accepted: false, code: "AGENT_RUN_INTERRUPT_REJECTED", message: "no active turn" }));
      const agentRun = new AgentRun({ context, providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch }, backend: {
        runId: "lead-run", runtimeKind: "codex_app_server", compactionRecovery: { kind: "unsupported" },
        inputCapabilities: { activeTurnAppend: "unsupported" }, getContext: () => context, getPlatformAgentRunId: () => "p",
        isActive: () => true, getLifecycleSnapshot: () => snapshot,
        subscribeToSourceEventBatches: (next: typeof publish) => { publish = next; return () => { publish = null; }; },
        dispatchUserInput: vi.fn(), approveToolInvocation: vi.fn(), interrupt: backendInterrupt,
        terminate: vi.fn(async () => ({ accepted: true })),
      } as never });
      const f = build({
        handleTerminate: async () => ({ accepted: true }),
        handleFence: () => agentRun.fenceInputAndInterruptForRootShutdown(),
      });

      const firstStop = f.run.terminate();
      await vi.advanceTimersByTimeAsync(5000);
      await expect(firstStop).resolves.toMatchObject({ accepted: false, code: "AGENT_RUN_INTERRUPT_REJECTED" });
      expect(f.onTerminated).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("activeTurn=IDENTIFIED(turn-busy)"));

      // The turn finishes on its own; the second Stop starts a new AgentRun attempt that settles accepted.
      snapshot = { availability: "active", phase: "idle", currentTurn: { kind: "NONE" } };
      await publish!([{ eventType: AgentRunEventType.TURN_COMPLETED, runId: "lead-run", payload: { turn_id: "turn-busy" }, statusHint: null }]);
      await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
      expect(f.handle.fenceForRootShutdown).toHaveBeenCalledTimes(2);
      expect(backendInterrupt).toHaveBeenCalledOnce();
      expect(f.onTerminated).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
      vi.useRealTimers();
    }
  });

  it("keeps the fail-stop settlement path when retrying a failed fail-stop termination", async () => {
    const f = build({ handleTerminate: vi.fn<() => Promise<Result>>()
      .mockRejectedValueOnce(new Error("member termination failed"))
      .mockResolvedValue({ accepted: true }) });

    f.run.enterLifecycleFailStop();
    await vi.waitFor(() => expect(f.handle.terminate).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect((f.run as never as { termination: unknown }).termination).toBeNull());

    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    // Delegated-child shutdown is runtime-only: both attempts drain the lifecycle queue; nothing settles.
    expect(f.drain).toHaveBeenCalledTimes(2);
    expect(f.onTerminated).toHaveBeenCalledOnce();
  });
});
