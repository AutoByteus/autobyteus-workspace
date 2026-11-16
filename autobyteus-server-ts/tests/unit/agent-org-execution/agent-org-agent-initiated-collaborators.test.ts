import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRecipientResolver } from "../../../src/agent-org-execution/services/agent-org-recipient-resolver.js";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

type Org = Awaited<ReturnType<typeof buildOrg>>;
const identity = (f: Org, memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress, agentRunId });

describe("agent-initiated messaging in an AgentOrg", () => {
  it("lists the catalog and never creates a run for send_message_to: an outside address is not found with delegate_task guidance (AC-005)", async () => {
    const f = await buildOrg();
    const director = identity(f, "/director", "director");
    await expect(f.owner.listAvailableAgents(director)).resolves.toEqual([
      { name: "Director", kind: "agent", address: "/director", description: "d" },
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designs" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product" },
    ]);
    for (const address of ["/code_reviewer", "/product_team"]) {
      await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: address, content: "one" }))
        .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: expect.stringContaining("delegate_task") });
    }
    expect(f.teams.list().map((run) => run.teamRunId)).toEqual(["configured-team"]);
    expect(JSON.stringify(f.owner.getExecutionTreeSnapshot())).not.toContain("taskExecutions");
    expect(f.owner.getCommunicationSnapshot().messages).toEqual([]);
  });

});

/**
 * Where an Org agent's `delegate_task(address)` lands (DS-001, CM-1). The run it starts is its own run (autobyteus-461):
 * what is checked here is the placement and its snapshot; the run and its Task entry are TaskDelegation's.
 */
describe("AgentOrg delegation placement", () => {
  const lead = testOrgAgentNode("/target/lead", "configured-lead");
  const writer = testOrgAgentNode("/target/writer", "configured-writer");
  const tree = testAgentOrgExecutionTree({ orgRunId: "org", members: [
    testOrgAgentNode("/director", "director"),
    testOrgTeamNode({ address: "/target", teamRunId: "target-team", coordinatorAddress: lead.address, members: [lead, writer] }),
  ] });
  const index = new AgentOrgExecutionIndex(tree);
  const catalogTaskSource = vi.fn(async () => null);
  const resolver = new AgentOrgRecipientResolver({ getIndex: () => index, collaborators: { catalogTaskSource } as never });
  const sender = (memberAddress: string, agentRunId: string) =>
    createCollaborationMemberExecutionIdentity({ root: index.root, memberAddress, agentRunId });
  const work = { description: "Do it" } as never;

  it("refuses the sender's own address and its own Team's addresses, with guidance (REQ-012, AC-003, DEC-008)", async () => {
    await expect(resolver.resolveDelegationPlacement(sender("/target/lead", "configured-lead"), "/target/lead", work, null))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED", message: expect.stringContaining("you can't delegate to yourself") });
    for (const own of ["/target/writer", "/target"]) {
      await expect(resolver.resolveDelegationPlacement(sender("/target/lead", "configured-lead"), own, work, null))
        .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED", message: expect.stringContaining("send_message_to") });
    }
    expect(catalogTaskSource).not.toHaveBeenCalled();
  });

  it("places a configured placement outside the sender's Team with its snapshot as it is now (D-1, D-6)", async () => {
    await expect(resolver.resolveDelegationPlacement(sender("/target/lead", "configured-lead"), "/director", work, null)).resolves.toMatchObject({
      kind: "agent", address: "/director", source: { kind: "agent", launchSource: { origin: "configured", fallbacks: [] } } });
    await expect(resolver.resolveDelegationPlacement(sender("/director", "director"), "/target", work, null)).resolves.toMatchObject({
      kind: "agent_team", address: "/target", coordinatorAddress: "/target/lead",
      source: { kind: "agent_team", coordinatorAddress: "/target/lead", defaultLaunchSource: { origin: "configured", fallbacks: [] } } });
  });

  it("asks the catalog for an address the Org does not configure (AC-005)", async () => {
    await expect(resolver.resolveDelegationPlacement(sender("/director", "director"), "/code_reviewer", work, null))
      .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
    expect(catalogTaskSource).toHaveBeenCalledWith(expect.objectContaining({ address: "/code_reviewer", senderRunId: "director" }));
  });
});
