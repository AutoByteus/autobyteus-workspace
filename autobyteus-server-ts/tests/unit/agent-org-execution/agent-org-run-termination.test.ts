import { describe, expect, it, vi } from "vitest";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

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
      tasks: Object.freeze({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        records: Object.freeze([]),
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
    const taskEngine = (run as never as {
      taskEngine: { shutdownAndSettle(reason: string): Promise<void> };
    }).taskEngine;
    vi.spyOn(taskEngine, "shutdownAndSettle").mockImplementation(async () => {
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
      tasks: Object.freeze({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: Object.freeze([]) }),
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
    const taskEngine = (run as never as {
      taskEngine: { shutdownAndSettle(reason: string): Promise<void>; drain(): Promise<void>; enterRootFailStop(): void };
    }).taskEngine;
    const shutdownAndSettle = vi.spyOn(taskEngine, "shutdownAndSettle").mockResolvedValue(undefined);
    const drain = vi.spyOn(taskEngine, "drain").mockResolvedValue(undefined);
    vi.spyOn(taskEngine, "enterRootFailStop").mockImplementation(() => undefined);
    return { run, handle, onTerminated, shutdownAndSettle, drain };
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

  it("keeps the fail-stop settlement path when retrying a failed fail-stop termination", async () => {
    const f = build({ handleTerminate: vi.fn<() => Promise<Result>>()
      .mockRejectedValueOnce(new Error("member termination failed"))
      .mockResolvedValue({ accepted: true }) });

    f.run.enterLifecycleFailStop();
    await vi.waitFor(() => expect(f.handle.terminate).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect((f.run as never as { termination: unknown }).termination).toBeNull());

    await expect(f.run.terminate()).resolves.toEqual({ accepted: true });
    expect(f.drain).toHaveBeenCalledTimes(2);
    expect(f.shutdownAndSettle).not.toHaveBeenCalled();
    expect(f.onTerminated).toHaveBeenCalledOnce();
  });
});
