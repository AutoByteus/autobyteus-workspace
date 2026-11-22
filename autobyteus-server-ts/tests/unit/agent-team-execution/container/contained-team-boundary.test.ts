import { describe, expect, it, vi } from "vitest";
import { createAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ContainedTeamAddressSpace } from "../../../../src/agent-team-execution/container/contained-team-address-space.js";
import { teamMentionViewerOf } from "../../../../src/agent-team-execution/container/contained-team-mention-viewer.js";
import { buildDeliveryEndpointForParticipant } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamChangeNoticeSource } from "../../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { TeamExecutionIndex } from "../../../../src/agent-team-execution/services/team-execution-index.js";
import { buildInitialTeamRunExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { teamCollaboratorPortFor } from "../../../../src/agent-team-execution/services/team-run-collaborators.js";
import { TeamRunMessageDelivery } from "../../../../src/agent-team-execution/services/team-run-message-delivery.js";
import { testAgentNode, testTeamRunConfig } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * Design R-1'', R-1''' (org-teams-follow-definition): a Team unit's tree stays in team space; `ContainedTeamAddressSpace`
 * is its one tool-facing address boundary. Example: Team `/software_engineering_team` (`P`) with stored members
 * `/solution_designer` (coordinator), `/code_reviewer`, and a former member `/old_reviewer`.
 */
const P = "/software_engineering_team";
const TEAM = "set_team_1";
const config = testTeamRunConfig({
  rootTeamRunId: TEAM, coordinatorAddress: "/solution_designer",
  children: [testAgentNode("/solution_designer", { agentRunId: "sd_1" }), testAgentNode("/code_reviewer", { agentRunId: "cr_1" })],
  handoffs: [{ from: "/code_reviewer", to: "/solution_designer", rules: ["When the review is done."] }],
});
const initial = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Software Engineering Team" });
const tree = Object.freeze({
  ...initial, containedIn: { orgRunId: "sdd_org_1", address: createAgentTeamAddress(P.slice(1).split("/")) },
  rootTeam: { ...initial.rootTeam, formerMembers: [{ ...initial.rootTeam.members[1]!, address: createAgentTeamAddress(["old_reviewer"]), agentRunId: "old_1" }] },
});
const identity = (memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity(TEAM), memberAddress: memberAddress as never, agentRunId });
const REVIEWER = identity("/code_reviewer", "cr_1");
const DESIGNER = identity("/solution_designer", "sd_1");

const delivery = (overrides: { reached?: unknown; standalone?: boolean } = {}) => {
  const deliver = vi.fn(async (input: { receiverIdentity: { agentRunId: string; memberAddress: string } }) =>
    ({ accepted: true as const, agentRunId: input.receiverIdentity.agentRunId, agentAddress: input.receiverIdentity.memberAddress }));
  const reachedPlacementAt = vi.fn(async () => overrides.reached ?? null);
  const catalogTaskSource = vi.fn(async () => null);
  const index = new TeamExecutionIndex(overrides.standalone ? initial : tree);
  const subject = new TeamRunMessageDelivery({
    rootTeamRunId: TEAM, getIndex: () => index,
    collaborators: { reachedPlacementAt, catalogTaskSource } as never,
    communication: { deliver } as never,
    authorizeIdentity: () => undefined, isLiveAgent: () => true, receivedFiles: {} as never, memberFolderOf: async () => "/unused",
    remoteLinks: { endpointFor: () => null } as never, remoteSend: {} as never,
  });
  const send = (sender: typeof REVIEWER, recipientAddress: string) => subject.deliverToAddress({
    rootTeamRunId: TEAM, recipientAddress, content: "hello",
    sender: buildDeliveryEndpointForParticipant({ kind: "agent", identity: sender, displayName: sender.memberAddress.slice(1) }),
  } as never);
  const delegate = (sender: typeof REVIEWER, address: string) => subject.resolveDelegationPlacement(sender, address, {} as never, null);
  return { subject, deliver, reachedPlacementAt, catalogTaskSource, send, delegate };
};

describe("ContainedTeamAddressSpace (R-1'', R-1''')", () => {
  const space = ContainedTeamAddressSpace.of(tree.containedIn)!;

  it("in: P/x is a member in team space, P is the own Team (never the root), any other address is Org space", () => {
    expect(space.input(createAgentTeamAddress(["software_engineering_team", "code_reviewer"]))).toEqual({ kind: "member", teamAddress: "/code_reviewer" });
    expect(space.input(createAgentTeamAddress(["software_engineering_team"]))).toEqual({ kind: "own_team" });
    expect(space.input(createAgentTeamAddress(["solution_designer"]))).toEqual({ kind: "org", orgAddress: "/solution_designer" });
    expect(space.input(createAgentTeamAddress(["software_engineering_team_2", "x"]))).toEqual({ kind: "org", orgAddress: "/software_engineering_team_2/x" });
  });

  it("out: /x → P/x, the instance / → P; fromOrg is the inverse inside the Team only; a Team outside any Org has none", () => {
    expect(space.toOrg("/code_reviewer")).toBe(`${P}/code_reviewer`);
    expect(space.toOrg("/")).toBe(P);
    expect(space.fromOrg(`${P}/code_reviewer`)).toBe("/code_reviewer");
    expect(space.fromOrg(P)).toBeNull();
    expect(space.fromOrg("/concierge")).toBeNull();
    expect(space.rulesToOrg(tree.handoffs)).toEqual([{ from: `${P}/code_reviewer`, to: `${P}/solution_designer`, rules: ["When the review is done."] }]);
    expect(ContainedTeamAddressSpace.of(undefined)).toBeNull();
  });
});

describe("send_message_to from a Team unit's member (R-1'' In/Out, R-1''')", () => {
  it("P/x reaches the teammate /x; the received header names the sender P/x (MP-06); the result shows the address used", async () => {
    const d = delivery();
    const result = await d.send(REVIEWER, `${P}/solution_designer`);
    expect(d.deliver).toHaveBeenCalledWith(expect.objectContaining({ receiverIdentity: expect.objectContaining({ agentRunId: "sd_1", memberAddress: "/solution_designer" }),
      senderAddress: `${P}/code_reviewer` }));
    expect(result).toMatchObject({ accepted: true, agentRunId: "sd_1", agentAddress: `${P}/solution_designer` });
  });

  it("P reaches the Team's coordinator, shown as P (as in the Org before)", async () => {
    const d = delivery();
    const result = await d.send(REVIEWER, P);
    expect(d.deliver).toHaveBeenCalledWith(expect.objectContaining({ receiverIdentity: expect.objectContaining({ agentRunId: "sd_1" }) }));
    expect(result).toMatchObject({ accepted: true, agentRunId: "sd_1", agentAddress: P });
  });

  it("a bare /x is Org space, not a teammate: not this run's (step 2 asks the container), named as given", async () => {
    const d = delivery();
    await expect(d.send(REVIEWER, "/solution_designer")).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: expect.stringContaining("/solution_designer") });
    await expect(d.send(REVIEWER, `${P}/nobody`)).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: expect.stringContaining(`${P}/nobody`) });
    expect(d.deliver).not.toHaveBeenCalled();
  });

  it("a member that left is refused with the former-member text naming P/x, by address and by run ID", async () => {
    const d = delivery();
    await expect(d.send(REVIEWER, `${P}/old_reviewer`)).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: expect.stringContaining(`${P}/old_reviewer`) });
    await expect(d.subject.deliverToRunId({ sender: { kind: "agent", identity: REVIEWER, displayName: "code_reviewer" } as never, targetAgentRunId: "old_1", content: "x" }))
      .resolves.toMatchObject({ accepted: false, message: expect.stringContaining(`${P}/old_reviewer`) });
  });

  it("a Team outside any Org is unchanged: /x is its teammate, shown as /x", async () => {
    const d = delivery({ standalone: true });
    await expect(d.send(REVIEWER, "/solution_designer")).resolves.toMatchObject({ accepted: true, agentAddress: "/solution_designer" });
    expect(d.deliver).toHaveBeenCalledWith(expect.objectContaining({ senderAddress: "/code_reviewer" }));
  });
});

describe("delegate_task from a Team unit's member (R-1''', MP-05)", () => {
  it("P and P/x are its own Team: refused with CM-1's exact text naming the address given, before any placement", async () => {
    const d = delivery();
    await expect(d.delegate(REVIEWER, P)).rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED",
      message: `${P} is in your own team; you can't delegate to it. Talk with it using send_message_to.` });
    await expect(d.delegate(REVIEWER, `${P}/solution_designer`)).rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED",
      message: `${P}/solution_designer is in your own team; you can't delegate to it. Talk with it using send_message_to.` });
    await expect(d.delegate(REVIEWER, `${P}/code_reviewer`)).rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED", message: expect.stringContaining(`${P}/code_reviewer`) });
    expect(d.reachedPlacementAt).not.toHaveBeenCalled();
  });

  it("another unit's Org address is a placement step 2 reaches (a copy of it, as the Org's configured placement before)", async () => {
    const placement = { kind: "agent_team", address: "/product_design_prototyping_team" };
    const d = delivery({ reached: placement });
    await expect(d.delegate(DESIGNER, "/product_design_prototyping_team")).resolves.toBe(placement);
    expect(d.reachedPlacementAt).toHaveBeenCalledWith("/product_design_prototyping_team");
    // A bare address equal to a teammate's stored one is Org space too (no team-space own-Team check applies).
    await expect(d.delegate(REVIEWER, "/solution_designer")).resolves.toBe(placement);
  });
});

describe("Presentation through the boundary (R-1'' Out)", () => {
  it("list_available_agents and @ show the Team's members at P/x; the own Team mention is P", async () => {
    const port = teamCollaboratorPortFor(tree, async () => []);
    expect([...(await port.addressesInUse())].sort()).toEqual([`${P}/code_reviewer`, `${P}/solution_designer`]);
    const placements = [...(await port.inRunPlacementsByDefinition()).values()].flat().map((placement) => placement.address).sort();
    expect(placements).toEqual([`${P}/code_reviewer`, `${P}/solution_designer`]);
    const viewer = teamMentionViewerOf(new TeamExecutionIndex(tree), "cr_1");
    expect(viewer.ownTeam).toMatchObject({ selfAddress: `${P}/code_reviewer`, teamAddress: P, teamDefinitionId: tree.rootTeam.teamDefinitionId });
    expect(viewer.relation(createAgentTeamAddress(["software_engineering_team", "code_reviewer"]))).toBe("self");
    expect(viewer.relation(createAgentTeamAddress(["software_engineering_team", "solution_designer"]))).toBe("own_team");
    expect(viewer.relation(createAgentTeamAddress(["software_engineering_team"]))).toBe("own_team");
    expect(viewer.relation(createAgentTeamAddress(["solution_designer"]))).toBe("other");
  });

  it("a membership change notice names the joined and left members at P/x", async () => {
    const notices = new TeamChangeNoticeSource();
    notices.recordChange({ tree, handoffsBefore: tree.handoffs, joined: [{ agentRunId: "new_1", address: createAgentTeamAddress(["architect"]) }],
      left: [{ agentRunId: "old_1", address: createAgentTeamAddress(["old_reviewer"]) }] } as never);
    const preface = await notices.takePreface({ runId: "cr_1" } as never);
    expect(preface?.text).toContain(`Joined: architect at ${P}/architect.`);
    expect(preface?.text).toContain(`Left: old_reviewer (${P}/old_reviewer); messages to it are no longer delivered.`);
  });
});
