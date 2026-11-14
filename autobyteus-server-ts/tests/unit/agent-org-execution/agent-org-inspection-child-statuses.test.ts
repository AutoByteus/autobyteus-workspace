import { describe, expect, it, vi } from "vitest";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { noWorkGuard } from "../../helpers/no-delegations.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-461 SR-083 (superseding CR-461-011's relayed statuses): an Org's inspection lists its own agents' statuses and
 * its delegated rows; a delegated run's status is that run's own, read by its run ID (`/ws/run-status`), not in the view.
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
const serviceWith = (inspection = activeInspection) => new AgentOrgRunService({ workGuard: noWorkGuard(),
  manager: { getInspection: vi.fn(async () => inspection) } } as never);
// The run's rows as the inspection reads them (SR-061: `RunViewChildren.read`).
const children = () => ({ read: vi.fn(async () => ({ rows: { taskExecutions: [child], remoteTaskExecutions: [], closedTaskExecutions: [] } })) });

describe("an Org's inspection with a delegated child (SR-083)", () => {
  it("an active Org lists its own agents' statuses and its delegated row, whose status is not in the view; it parses", async () => {
    const view = children();
    const dto = await serviceWith().getInspection("org", view as never);
    expect(view.read).toHaveBeenCalledWith({ rootSubjectKind: "agent_org", rootRunId: "org" });
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual([expect.objectContaining({ agent_run_id: "ceo_run", status: "idle" })]);
    expect(dto.root_org.execution_tree.rootOrg.taskExecutions).toEqual([expect.objectContaining({ agentRunId: "analyst_run" })]);
  });

  it("a stopped Org's inspection carries no statuses, as its contract requires; its delegated rows are listed (found by SDV-03)", async () => {
    const dto = await serviceWith({ ...activeInspection, isActive: false, liveSequenceId: null, lastMessageChangeSequence: null,
      snapshot: { ...activeInspection.snapshot, statuses: [] } } as never).getInspection("org", children() as never);
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual([]);
    expect(dto.root_org.execution_tree.rootOrg.taskExecutions).toEqual([expect.objectContaining({ agentRunId: "analyst_run" })]);
  });
});
