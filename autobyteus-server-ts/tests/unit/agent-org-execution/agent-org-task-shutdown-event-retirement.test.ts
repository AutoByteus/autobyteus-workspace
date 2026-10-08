import { describe, expect, it, vi } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { createCollaborationAgentStatusSnapshot } from "../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import type { TaskExecutionIdleTimers } from "../../../src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("AgentOrg mounted-Team delegated execution shutdown event retirement", () => {
  it("retires the child's teardown events, keeps the execution in the tree, and publishes one offline status", async () => {
    const orgRunId = "org-mounted-task-shutdown";
    const root = createAgentOrgRootExecutionIdentity(orgRunId);
    const taskAgentRunId = "task-analyst-run";
    const analystAddress = assertAgentTeamAddress("/research-team/analyst");
    const configuredTeam = testOrgTeamNode({
      address: "/research-team",
      teamRunId: "research-team-run",
      coordinatorAddress: "/research-team/coordinator",
      members: [
        testOrgAgentNode("/research-team/coordinator", "research-coordinator-run"),
        testOrgAgentNode(analystAddress, "configured-analyst-run"),
      ],
    });
    const tree = testAgentOrgExecutionTree({
      orgRunId,
      members: [
        testOrgAgentNode("/delegator", "delegator-run"),
        {
          ...configuredTeam,
          taskExecutions: Object.freeze([{
            address: analystAddress,
            agentRunId: taskAgentRunId,
            platformAgentRunId: "provider-task-analyst",
            delegatorAgentRunId: "delegator-run",
            startedAt: "2026-09-01T00:00:01.000Z",
          }]),
        },
      ],
    });
    const publisher = new RootEventPublisher<AgentOrgRunEvent>();
    const published: AgentOrgRunEvent[] = [];
    publisher.subscribe(({ event }) => published.push(event));
    const persistenceFailStop = vi.fn();
    let run!: AgentOrgRun;
    const taskIdentity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: analystAddress,
      agentRunId: taskAgentRunId,
    });
    let live = true;
    const mountedTeam = {
      isActive: vi.fn(() => true),
      hasLiveDirectTaskExecution: vi.fn(() => live),
      // Teardown emits the child's own runtime status while retirement is open.
      tryShutDownDirectTaskExecutionIfQuiet: vi.fn(async () => {
        run.onAgentExecutionEvent(taskIdentity, {
          kind: "agent_run",
          event: {
            eventType: AgentRunEventType.AGENT_STATUS,
            runId: taskAgentRunId,
            payload: { status: "offline" },
            statusHint: "IDLE",
          },
        });
        live = false;
        return true;
      }),
      getLeafAgentStatusSnapshots: vi.fn(() => []),
    };
    const teams = {
      require: vi.fn((teamRunId: string) => {
        expect(teamRunId).toBe(configuredTeam.teamRunId);
        return mountedTeam;
      }),
      get: vi.fn(() => mountedTeam),
      list: vi.fn(() => []),
      unregisterTerminated: vi.fn(),
      hasOpenExecutionWork: vi.fn(() => false),
      freezeForRootTermination: vi.fn(() => []),
    };
    const rootAgents = {
      get: vi.fn(() => ({})),
      listHandles: vi.fn(() => []),
      isActive: vi.fn(() => true),
      hasOpenExecutionWork: vi.fn(() => false),
      freezeForRootTermination: vi.fn(() => []),
    };
    const commitTreeMutation = vi.fn();
    let fire: (() => void) | null = null;
    const timers: TaskExecutionIdleTimers = {
      setTimeout: (callback) => { fire = callback; return 1; },
      clearTimeout: () => { fire = null; },
    };
    run = new AgentOrgRun({
      root,
      tree,
      messages: Object.freeze({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        messages: Object.freeze([]),
      }),
      rootAgents: rootAgents as never,
      teams: teams as never,
      callbacks: {} as never,
      persistence: { commitTreeMutation, enterRootFailStop: persistenceFailStop, drain: vi.fn(async () => undefined) } as never,
      publisher,
      taskExecutionIdentity: {} as never,
      taskExecutionIdleShutdown: { gracePeriodMs: () => 60_000, timers },
    });
    run.activate();

    run.onAgentExecutionEvent(taskIdentity, {
      kind: "status_overlay",
      snapshot: createCollaborationAgentStatusSnapshot({ execution: taskIdentity, status: "idle" }),
    });
    expect(fire).not.toBeNull();
    const beforeShutdown = published.length;
    fire!();
    for (let i = 0; i < 3; i += 1) {
      await flush();
      await (run as unknown as { taskExecutions: { drain(): Promise<void> } }).taskExecutions.drain();
    }

    expect(mountedTeam.tryShutDownDirectTaskExecutionIfQuiet).toHaveBeenCalledWith({ agentRunId: taskAgentRunId });
    // Shutdown is runtime-only: no tree write, and the execution stays for display and wake.
    expect(commitTreeMutation).not.toHaveBeenCalled();
    const mounted = run.getExecutionTreeSnapshot().rootOrg.members
      .find((member) => "teamRunId" in member && member.teamRunId === configuredTeam.teamRunId);
    expect(mounted && "teamRunId" in mounted ? mounted.taskExecutions.map((task) => task.agentRunId) : []).toEqual([taskAgentRunId]);
    expect(run.hasAgentExecution(taskAgentRunId)).toBe(true);
    // The retired teardown event is suppressed; the lifecycle publishes exactly one offline status.
    const statuses = published.slice(beforeShutdown).filter((event) => event.kind === "agent_presentation"
      && event.execution.agentRunId === taskAgentRunId);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({ message: { type: "AGENT_STATUS", payload: { status: "offline" } } });
    expect(persistenceFailStop).not.toHaveBeenCalled();
    expect(run.isActive()).toBe(true);
  });
});
