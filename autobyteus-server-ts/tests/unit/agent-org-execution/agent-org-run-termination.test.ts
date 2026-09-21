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
