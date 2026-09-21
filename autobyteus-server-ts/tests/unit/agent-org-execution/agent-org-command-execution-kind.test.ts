import { describe, expect, it, vi } from "vitest";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

describe("AgentOrgRun command execution kind", () => {
  it("returns exact configured/task kind while preserving the generic result-only command surface", async () => {
    const orgRunId = "org-command-kind";
    const direct = testOrgAgentNode("/director", "direct-run");
    const lead = testOrgAgentNode("/team/lead", "lead-run");
    const team = testOrgTeamNode({ address: "/team", teamRunId: "team-run", coordinatorAddress: lead.address, members: [lead] });
    const base = testAgentOrgExecutionTree({ orgRunId, members: [direct, team] });
    const task = { address: direct.address, agentRunId: "task-run", platformAgentRunId: null, startedAt: "2026-09-05T00:00:01.000Z", settledAt: null } as const;
    const tree = { ...base, rootOrg: { ...base.rootOrg, taskExecutions: [task] } };
    const rootCommand = vi.fn(async () => ({ accepted: true as const }));
    const teamCommand = vi.fn(async () => ({ accepted: true as const }));
    const run = new AgentOrgRun({
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      tree,
      tasks: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: [{
        taskId: "task-1", delegatorAgentRunId: direct.agentRunId, recipientAddress: direct.address,
        taskExecution: { agentRunId: task.agentRunId }, description: "Task", referenceFiles: [],
        status: "active", updates: [], createdAt: task.startedAt,
      }] },
      messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
      rootAgents: { executeCommand: rootCommand, listHandles: () => [] } as never,
      teams: { require: () => ({ executeDirectAgentCommand: teamCommand }), list: () => [] } as never,
      callbacks: {} as never,
      persistence: {} as never,
      publisher: new RootEventPublisher<AgentOrgRunEvent>(),
      taskExecutionIdentity: {} as never,
    });
    run.activate();
    const command = { kind: "interrupt" as const };
    await expect(run.executeAgentCommandWithExecutionKind(direct.agentRunId, command))
      .resolves.toMatchObject({ result: { accepted: true }, executionKind: "configured" });
    await expect(run.executeAgentCommandWithExecutionKind(lead.agentRunId, command))
      .resolves.toMatchObject({ result: { accepted: true }, executionKind: "configured" });
    await expect(run.executeAgentCommandWithExecutionKind(task.agentRunId, command))
      .resolves.toMatchObject({ result: { accepted: true }, executionKind: "task" });
    await expect(run.executeAgentCommand(direct.agentRunId, command)).resolves.toEqual({ accepted: true });
    expect(rootCommand).toHaveBeenCalledTimes(3);
    expect(teamCommand).toHaveBeenCalledTimes(1);
  });
});
