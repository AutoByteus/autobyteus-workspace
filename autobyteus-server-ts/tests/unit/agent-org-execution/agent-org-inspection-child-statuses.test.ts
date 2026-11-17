import { describe, expect, it, vi } from "vitest";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { noWorkGuard, noEpisodicCatalog } from "../../helpers/no-delegations.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-461 SR-083 (superseding CR-461-011's relayed statuses), SR-084: an Org's inspection lists its own agents and
 * their statuses; the runs it delegated are its tree's rows (`runTree`), and each one's status is its own, read by its
 * run ID (`/ws/run-status`), never in the view.
 */
const tree = testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/ceo", "ceo_run")] });
const activeInspection = {
  orgRunId: "org", isActive: true, baseChangeSequence: 3, liveSequenceId: "live-1", lastMessageChangeSequence: 2,
  snapshot: { tree, inputStates: [], statuses: [{ execution: { memberAddress: "/ceo", agentRunId: "ceo_run" },
    details: { status: "idle", trigger: null, errorMessage: null, recoverableBlock: null } }] },
};
const serviceWith = (inspection = activeInspection) => new AgentOrgRunService({ workGuard: noWorkGuard(), episodicCatalog: noEpisodicCatalog(),
  manager: { getInspection: vi.fn(async () => inspection) } } as never);

describe("an Org's inspection with a delegated child (SR-083)", () => {
  it("an active Org lists its own agents' statuses, and no delegated rows; it parses", async () => {
    const dto = await serviceWith().getInspection("org");
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual([expect.objectContaining({ agent_run_id: "ceo_run", status: "idle" })]);
    expect(dto.root_org.execution_tree.rootOrg).not.toHaveProperty("taskExecutions");
  });

  it("a stopped Org's inspection carries no statuses, as its contract requires (found by SDV-03)", async () => {
    const dto = await serviceWith({ ...activeInspection, isActive: false, liveSequenceId: null, lastMessageChangeSequence: null,
      snapshot: { ...activeInspection.snapshot, statuses: [] } } as never).getInspection("org");
    if (dto.root_subject_kind !== "agent_org") throw new Error("expected an Org view");
    expect(dto.root_org.agent_statuses).toEqual([]);
  });
});
