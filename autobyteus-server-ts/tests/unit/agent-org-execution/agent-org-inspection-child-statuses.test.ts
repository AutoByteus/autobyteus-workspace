import { describe, expect, it, vi } from "vitest";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { noWorkGuard } from "../../helpers/no-delegations.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-461 CR-461-011 (SCN-005 / AC-007, design DS-8 `statuses`): an active Org's inspection lists a status for
 * every agent of its delegated children, from each child's own run, as its view session does.
 */
const tree = testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/ceo", "ceo_run")] });
const activeInspection = {
  orgRunId: "org", isActive: true, baseChangeSequence: 3, liveSequenceId: "live-1", lastMessageChangeSequence: 2,
  snapshot: { tree, inputStates: [], statuses: [{ execution: { memberAddress: "/ceo", agentRunId: "ceo_run" },
    details: { status: "idle", trigger: null, errorMessage: null, recoverableBlock: null } }] },
};
/** A run the CEO delegated to, as the view's projection reads it from its own file. */
const child = { address: "/analyst", agentRunId: "analyst_run", platformAgentRunId: null, delegatorAgentRunId: "ceo_run",
  startedAt: "2026-11-12T00:00:00.000Z", source: { kind: "agent", agentDefinitionId: "analyst", launchConfiguration: testOrgLaunchConfiguration() } };
const serviceWith = () => new AgentOrgRunService({ workGuard: noWorkGuard(),
  manager: { getInspection: vi.fn(async () => activeInspection) } } as never);
// The run's rows as the inspection reads them (SR-061: `RunViewChildren.read`): the child, and its agents' statuses.
const children = (statuses: unknown[]) => ({ read: vi.fn(async () => ({ rows: { taskExecutions: [child], remoteTaskExecutions: [], closedTaskExecutions: [] }, statuses })) });

describe("an active Org's inspection with a delegated child (CR-461-011)", () => {
  it("lists the child's status from its own run and parses", async () => {
    const view = children([{ agentRunId: "analyst_run", memberAddress: "/analyst", status: "running" }]);
    const dto = await serviceWith().getInspection("org", view as never);
    expect(view.read).toHaveBeenCalledWith({ rootSubjectKind: "agent_org", rootRunId: "org" });
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ agent_run_id: "ceo_run", status: "idle" }),
      expect.objectContaining({ agent_run_id: "analyst_run", member_address: "/analyst", status: "running" }),
    ]));
  });

  it("without the child's status the view is refused by the contract (what the inspection used to send)", async () => {
    await expect(serviceWith().getInspection("org", children([]) as never)).rejects.toThrow("AgentOrg AgentRun 'analyst_run' has no status record.");
  });

  it("a stopped Org's inspection carries no statuses, as its contract requires; its delegated rows are listed (found by SDV-03)", async () => {
    const stopped = new AgentOrgRunService({ workGuard: noWorkGuard(), manager: { getInspection: vi.fn(async () => ({ ...activeInspection, isActive: false,
      liveSequenceId: null, lastMessageChangeSequence: null, snapshot: { ...activeInspection.snapshot, statuses: [] } })) } } as never);
    const dto = await stopped.getInspection("org", children([{ agentRunId: "analyst_run", memberAddress: "/analyst", status: "offline" }]) as never);
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual([]);
    expect(dto.root_org.execution_tree.rootOrg.taskExecutions).toEqual([expect.objectContaining({ agentRunId: "analyst_run" })]);
  });
});

